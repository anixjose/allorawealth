import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { WithdrawalStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JournalService } from '../ledger/journal.service';
import { WalletService } from '../wallet/wallet.service';
import { AuditService } from '../audit/audit.service';
import { generateReferenceNumber } from '../common/reference-number';
import { toMoney } from '../common/money';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';

/**
 * Withdrawal workflow (blueprint §19, §24): request -> approve
 * (maker-checker) -> complete. The wallet is only reduced (a POSTED
 * ledger entry) at completion — the request step merely reserves funds
 * via a PENDING wallet_transaction, which is why it doesn't show up in
 * `availableBalance` but does show up as `pendingAmount`.
 */
@Injectable()
export class WithdrawalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly journalService: JournalService,
    private readonly walletService: WalletService,
    private readonly auditService: AuditService,
  ) {}

  async request(dto: CreateWithdrawalDto, actorId: string) {
    const amount = toMoney(dto.amount);
    if (amount.lessThanOrEqualTo(0)) {
      throw new BadRequestException('amount must be positive');
    }

    const investor = await this.prisma.investor.findUnique({ where: { id: dto.investorId } });
    if (!investor || investor.status !== 'ACTIVE') {
      throw new ForbiddenException(`Investor ${dto.investorId} is pending activation and cannot transact yet`);
    }

    const wallet = await this.prisma.wallet.findUnique({ where: { investorId: dto.investorId } });
    if (!wallet || wallet.status !== 'ACTIVE') {
      throw new NotFoundException(`No active wallet for investor ${dto.investorId}`);
    }

    return this.prisma.$transaction(async (tx) => {
      const availableBalance = await this.walletService.computeAvailableBalance(wallet.id, tx);
      const pendingReserved = await tx.walletTransaction.aggregate({
        where: {
          walletId: wallet.id,
          status: 'PENDING',
          transactionType: 'WITHDRAWAL',
          direction: 'DEBIT',
        },
        _sum: { amount: true },
      });
      const withdrawable = availableBalance.minus(toMoney(pendingReserved._sum.amount ?? 0));

      if (withdrawable.lessThan(amount)) {
        throw new BadRequestException(
          `Insufficient withdrawable balance: has ${withdrawable.toString()}, requested ${amount.toString()}`,
        );
      }

      const withdrawal = await tx.withdrawal.create({
        data: {
          withdrawalNumber: await generateReferenceNumber(tx, 'WDR'),
          investorId: dto.investorId,
          amount,
          currency: dto.currency,
          status: 'PENDING',
          requestedById: actorId,
        },
      });

      const walletTransaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          transactionNumber: await generateReferenceNumber(tx, 'TXN'),
          transactionType: 'WITHDRAWAL',
          direction: 'DEBIT',
          amount,
          currency: dto.currency,
          referenceType: 'WITHDRAWAL',
          referenceId: withdrawal.id,
          status: 'PENDING',
        },
      });

      const updated = await tx.withdrawal.update({
        where: { id: withdrawal.id },
        data: { walletTransactionId: walletTransaction.id },
      });

      await this.auditService.record(
        {
          actorId,
          action: 'REQUEST_WITHDRAWAL',
          entityType: 'Withdrawal',
          entityId: withdrawal.id,
          after: { amount: amount.toString(), status: 'PENDING' },
        },
        tx,
      );

      return updated;
    });
  }

  async approve(withdrawalId: string, approverId: string) {
    return this.prisma.$transaction(async (tx) => {
      const withdrawal = await tx.withdrawal.findUniqueOrThrow({ where: { id: withdrawalId } });
      if (!['PENDING', 'UNDER_REVIEW'].includes(withdrawal.status)) {
        throw new BadRequestException(`Withdrawal ${withdrawalId} is not awaiting approval`);
      }
      if (withdrawal.requestedById === approverId) {
        throw new ForbiddenException('Maker cannot approve their own withdrawal request (maker-checker)');
      }

      const updated = await tx.withdrawal.update({
        where: { id: withdrawalId },
        data: { status: 'APPROVED', approvedById: approverId, approvedAt: new Date() },
      });

      await this.auditService.record(
        {
          actorId: approverId,
          action: 'APPROVE_WITHDRAWAL',
          entityType: 'Withdrawal',
          entityId: withdrawalId,
          before: { status: withdrawal.status },
          after: { status: 'APPROVED' },
        },
        tx,
      );

      return updated;
    });
  }

  async complete(withdrawalId: string, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const withdrawal = await tx.withdrawal.findUniqueOrThrow({ where: { id: withdrawalId } });
      if (withdrawal.status !== 'APPROVED') {
        throw new BadRequestException(`Withdrawal ${withdrawalId} is not approved`);
      }
      if (!withdrawal.walletTransactionId) {
        throw new BadRequestException(`Withdrawal ${withdrawalId} has no reserved wallet transaction`);
      }

      const journalEntry = await this.journalService.postJournal(
        {
          transactionDate: new Date(),
          transactionType: 'WITHDRAWAL',
          referenceType: 'WITHDRAWAL',
          referenceId: withdrawal.id,
          description: `Withdrawal ${withdrawal.withdrawalNumber}`,
          currency: withdrawal.currency,
          createdById: actorId,
          lines: [
            { accountCode: '2010', debit: withdrawal.amount, investorId: withdrawal.investorId }, // Dr Investor Wallet Liability
            { accountCode: '1010', credit: withdrawal.amount }, // Cr Bank
          ],
        },
        tx,
      );

      await tx.walletTransaction.update({
        where: { id: withdrawal.walletTransactionId },
        data: { status: 'POSTED', journalEntryId: journalEntry.id, postedAt: new Date() },
      });

      return tx.withdrawal.update({
        where: { id: withdrawalId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
    });
  }

  async reject(withdrawalId: string, reason: string, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const withdrawal = await tx.withdrawal.findUniqueOrThrow({ where: { id: withdrawalId } });
      if (['COMPLETED', 'REJECTED', 'CANCELLED'].includes(withdrawal.status)) {
        throw new BadRequestException(`Withdrawal ${withdrawalId} cannot be rejected from status ${withdrawal.status}`);
      }

      if (withdrawal.walletTransactionId) {
        await tx.walletTransaction.update({
          where: { id: withdrawal.walletTransactionId },
          data: { status: 'CANCELLED' },
        });
      }

      const updated = await tx.withdrawal.update({
        where: { id: withdrawalId },
        data: { status: 'REJECTED', rejectionReason: reason },
      });

      await this.auditService.record(
        {
          actorId,
          action: 'REJECT_WITHDRAWAL',
          entityType: 'Withdrawal',
          entityId: withdrawalId,
          before: { status: withdrawal.status },
          after: { status: 'REJECTED' },
          reason,
        },
        tx,
      );

      return updated;
    });
  }

  async findById(id: string) {
    const withdrawal = await this.prisma.withdrawal.findUnique({ where: { id } });
    if (!withdrawal) {
      throw new NotFoundException(`Withdrawal ${id} not found`);
    }
    return withdrawal;
  }

  /** Investor's own request history (filtered by investorId) or the admin/approver/finance queue (filtered by status, or both). */
  async findAll(filters: { investorId?: string; status?: WithdrawalStatus }) {
    return this.prisma.withdrawal.findMany({
      where: {
        investorId: filters.investorId,
        status: filters.status,
      },
      orderBy: { requestedAt: 'desc' },
    });
  }
}
