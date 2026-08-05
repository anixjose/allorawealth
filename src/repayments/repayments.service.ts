import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, RepaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaTransactionClient } from '../audit/audit.service';
import { JournalService } from '../ledger/journal.service';
import { generateReferenceNumber } from '../common/reference-number';
import { toMoney, sumMoney, ZERO, Money } from '../common/money';
import { RecordRepaymentDto } from './dto/record-repayment.dto';

@Injectable()
export class RepaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly journalService: JournalService,
  ) {}

  /**
   * Blueprint §17 step 1: "ROI becomes due" — Dr Investment Receivable /
   * Cr Investor ROI Payable. No cash has moved yet, so no wallet_transaction
   * is created here (only the actual receipt in `recordRepayment` touches
   * the wallet).
   */
  async accrueRoi(scheduleId: string, actorId: string) {
    const schedule = await this.prisma.repaymentSchedule.findUnique({
      where: { id: scheduleId },
      include: { investment: true },
    });
    if (!schedule) {
      throw new NotFoundException(`Repayment schedule ${scheduleId} not found`);
    }
    if (schedule.roiAccruedAt) {
      throw new BadRequestException(`ROI already accrued for schedule ${scheduleId}`);
    }
    if (schedule.investment.status !== 'ACTIVE') {
      throw new BadRequestException(`Investment ${schedule.investmentId} is not active`);
    }
    if (toMoney(schedule.roiDue).isZero()) {
      throw new BadRequestException('schedule has no ROI due to accrue');
    }

    return this.prisma.$transaction(async (tx) => {
      await this.journalService.postJournal(
        {
          transactionDate: new Date(),
          transactionType: 'ROI_ACCRUAL',
          referenceType: 'ROI_ACCRUAL',
          referenceId: schedule.id,
          description: `ROI accrual for investment ${schedule.investmentId}`,
          currency: 'INR',
          createdById: actorId,
          lines: [
            { accountCode: '1030', debit: schedule.roiDue, investorId: schedule.investment.investorId, investmentId: schedule.investmentId }, // Dr Investment Receivable
            { accountCode: '2030', credit: schedule.roiDue, investorId: schedule.investment.investorId, investmentId: schedule.investmentId }, // Cr Investor ROI Payable
          ],
        },
        tx,
      );

      return tx.repaymentSchedule.update({
        where: { id: scheduleId },
        data: { roiAccruedAt: new Date() },
      });
    });
  }

  /**
   * Records that a repayment was received from the investment — cash
   * arriving at the platform and, for ROI, clearing the accrued
   * receivable. This does NOT touch the investor's wallet: that only
   * happens once someone explicitly disburses it (see `disburseRepayments`
   * below). Principal has no separate "cash received" leg to record here
   * (unlike ROI's accrual/receivable), since the one journal it ever posts
   * is inherently the wallet-crediting leg — so recording principal is
   * GL-silent, just a claim stored on the `Repayment` row until disbursed.
   */
  async recordRepayment(dto: RecordRepaymentDto, actorId: string) {
    const principalAmount = toMoney(dto.principalAmount ?? 0);
    const roiAmount = toMoney(dto.roiAmount ?? 0);
    const otherAmount = toMoney(dto.otherAmount ?? 0);
    const totalAmount = sumMoney([principalAmount, roiAmount, otherAmount]);

    if (totalAmount.lessThanOrEqualTo(ZERO)) {
      throw new BadRequestException('repayment must include a positive principal, ROI, or other amount');
    }

    const investment = await this.prisma.investment.findUnique({
      where: { id: dto.investmentId },
      include: { investor: { include: { wallet: true } } },
    });
    if (!investment) {
      throw new NotFoundException(`Investment ${dto.investmentId} not found`);
    }
    if (investment.status !== 'ACTIVE') {
      throw new BadRequestException(`Investment ${dto.investmentId} is not active`);
    }
    const wallet = investment.investor.wallet;
    if (!wallet || wallet.status !== 'ACTIVE') {
      throw new NotFoundException(`No active wallet for investor ${investment.investorId}`);
    }

    let schedule = null as Awaited<ReturnType<typeof this.prisma.repaymentSchedule.findUnique>>;
    if (dto.scheduleId) {
      schedule = await this.prisma.repaymentSchedule.findUnique({ where: { id: dto.scheduleId } });
      if (!schedule || schedule.investmentId !== dto.investmentId) {
        throw new NotFoundException(`Schedule ${dto.scheduleId} not found for this investment`);
      }
      if (roiAmount.greaterThan(0) && !schedule.roiAccruedAt) {
        throw new BadRequestException('ROI must be accrued before it can be received');
      }
    }

    const paymentDate = dto.paymentDate ? new Date(dto.paymentDate) : new Date();
    const currency = wallet.currency;
    const investorId = investment.investorId;

    return this.prisma.$transaction(async (tx) => {
      const repayment = await tx.repayment.create({
        data: {
          investmentId: investment.id,
          scheduleId: dto.scheduleId,
          paymentDate,
          principalAmount,
          roiAmount,
          otherAmount,
          totalAmount,
          status: 'RECEIVED',
          recordedById: actorId,
        },
      });

      if (roiAmount.greaterThan(0)) {
        // Cash received against the accrued receivable. The wallet-crediting
        // leg (Dr ROI Payable / Cr Wallet Liability) moves to disbursement.
        await this.journalService.postJournal(
          {
            transactionDate: paymentDate,
            transactionType: 'ROI_RECEIPT',
            referenceType: 'REPAYMENT_ROI_CASH',
            referenceId: repayment.id,
            description: `ROI cash receipt for investment ${investment.investmentNumber}`,
            currency,
            createdById: actorId,
            lines: [
              { accountCode: '1010', debit: roiAmount, investorId, investmentId: investment.id }, // Dr Bank
              { accountCode: '1030', credit: roiAmount, investorId, investmentId: investment.id }, // Cr Investment Receivable
            ],
          },
          tx,
        );
      }

      if (dto.scheduleId) {
        await this.updateScheduleStatus(tx, dto.scheduleId);
      }
      await this.maybeCloseInvestment(tx, investment.id, investment.principalAmount);

      return tx.repayment.findUniqueOrThrow({ where: { id: repayment.id } });
    });
  }

  private async updateScheduleStatus(tx: PrismaTransactionClient, scheduleId: string) {
    const schedule = await tx.repaymentSchedule.findUniqueOrThrow({ where: { id: scheduleId } });
    const repayments = await tx.repayment.findMany({ where: { scheduleId } });
    const totalPaid = sumMoney(
      repayments.flatMap((r) => [r.principalAmount, r.roiAmount, r.otherAmount]),
    );
    const status = totalPaid.greaterThanOrEqualTo(schedule.totalDue) ? 'PAID' : 'PARTIALLY_PAID';
    await tx.repaymentSchedule.update({ where: { id: scheduleId }, data: { status } });
  }

  private async maybeCloseInvestment(
    tx: PrismaTransactionClient,
    investmentId: string,
    principalAmount: Prisma.Decimal.Value,
  ) {
    const repayments = await tx.repayment.findMany({ where: { investmentId } });
    const totalPrincipalPaid: Money = sumMoney(repayments.map((r) => r.principalAmount));
    const totalRoiPaid: Money = sumMoney(repayments.map((r) => r.roiAmount));

    if (totalPrincipalPaid.greaterThanOrEqualTo(principalAmount)) {
      const principal = toMoney(principalAmount);
      const actualRoi = principal.isZero() ? ZERO : totalRoiPaid.dividedBy(principal).times(100);
      await tx.investment.update({
        where: { id: investmentId },
        data: { status: 'CLOSED', actualRoi },
      });
    }
  }

  /** Credits the investor's wallet for a received-but-not-yet-disbursed repayment — the moved wallet-crediting legs. */
  private async disburseOne(tx: PrismaTransactionClient, repaymentId: string, actorId: string) {
    const repayment = await tx.repayment.findUnique({
      where: { id: repaymentId },
      include: { investment: { include: { investor: { include: { wallet: true } } } } },
    });
    if (!repayment) {
      throw new NotFoundException(`Repayment ${repaymentId} not found`);
    }
    if (repayment.status !== 'RECEIVED') {
      throw new BadRequestException(`Repayment ${repaymentId} is not awaiting disbursement (status: ${repayment.status})`);
    }

    const wallet = repayment.investment.investor.wallet;
    if (!wallet || wallet.status !== 'ACTIVE') {
      throw new NotFoundException(`No active wallet for investor ${repayment.investment.investorId}`);
    }

    const investorId = repayment.investment.investorId;
    const investmentId = repayment.investmentId;
    const currency = wallet.currency;
    const roiAmount = toMoney(repayment.roiAmount);
    const principalAmount = toMoney(repayment.principalAmount);

    if (roiAmount.greaterThan(0)) {
      const roiWalletJournal = await this.journalService.postJournal(
        {
          transactionDate: new Date(),
          transactionType: 'ROI_DISBURSEMENT',
          referenceType: 'REPAYMENT_ROI_WALLET',
          referenceId: repayment.id,
          description: `ROI disbursed to wallet for investment ${repayment.investment.investmentNumber}`,
          currency,
          createdById: actorId,
          lines: [
            { accountCode: '2030', debit: repayment.roiAmount, investorId, investmentId }, // Dr Investor ROI Payable
            { accountCode: '2010', credit: repayment.roiAmount, investorId, investmentId }, // Cr Investor Wallet Liability
          ],
        },
        tx,
      );

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          transactionNumber: await generateReferenceNumber(tx, 'TXN'),
          transactionType: 'ROI',
          direction: 'CREDIT',
          amount: repayment.roiAmount,
          currency,
          referenceType: 'REPAYMENT_ROI_WALLET',
          referenceId: repayment.id,
          journalEntryId: roiWalletJournal.id,
          status: 'POSTED',
          postedAt: new Date(),
        },
      });
    }

    if (principalAmount.greaterThan(0)) {
      const principalJournal = await this.journalService.postJournal(
        {
          transactionDate: new Date(),
          transactionType: 'PRINCIPAL_DISBURSEMENT',
          referenceType: 'REPAYMENT_PRINCIPAL',
          referenceId: repayment.id,
          description: `Principal disbursed to wallet for investment ${repayment.investment.investmentNumber}`,
          currency,
          createdById: actorId,
          lines: [
            { accountCode: '2020', debit: repayment.principalAmount, investorId, investmentId }, // Dr Investor Investment Payable
            { accountCode: '2010', credit: repayment.principalAmount, investorId, investmentId }, // Cr Investor Wallet Liability
          ],
        },
        tx,
      );

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          transactionNumber: await generateReferenceNumber(tx, 'TXN'),
          transactionType: 'PRINCIPAL_REPAYMENT',
          direction: 'CREDIT',
          amount: repayment.principalAmount,
          currency,
          referenceType: 'REPAYMENT_PRINCIPAL',
          referenceId: repayment.id,
          journalEntryId: principalJournal.id,
          status: 'POSTED',
          postedAt: new Date(),
        },
      });
    }

    return tx.repayment.update({
      where: { id: repayment.id },
      data: { status: 'DISBURSED', disbursedAt: new Date(), disbursedById: actorId },
    });
  }

  /**
   * Bulk disbursement: each id gets its own transaction (not one transaction
   * for the whole batch), so one bad id — already disbursed, not found —
   * doesn't roll back the others. Returns per-item results for partial
   * failure reporting.
   */
  async disburseRepayments(repaymentIds: string[], actorId: string) {
    const results: Array<{ repaymentId: string; success: boolean; error?: string }> = [];
    for (const repaymentId of repaymentIds) {
      try {
        await this.prisma.$transaction((tx) => this.disburseOne(tx, repaymentId, actorId));
        results.push({ repaymentId, success: true });
      } catch (err) {
        results.push({ repaymentId, success: false, error: err instanceof Error ? err.message : String(err) });
      }
    }
    return { results };
  }

  /** Repayments awaiting disbursement (status: RECEIVED) or filtered by investment/status for the admin queue. */
  async findAll(filters: { investmentId?: string; status?: RepaymentStatus }) {
    return this.prisma.repayment.findMany({
      where: {
        investmentId: filters.investmentId,
        status: filters.status,
      },
      include: {
        investment: {
          include: {
            investor: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } },
          },
        },
        recordedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        disbursedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
