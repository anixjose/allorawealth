import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DepositStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JournalService } from '../ledger/journal.service';
import { AuditService } from '../audit/audit.service';
import { generateReferenceNumber } from '../common/reference-number';
import { toMoney } from '../common/money';
import { RequestDepositDto } from './dto/request-deposit.dto';

/**
 * Deposit workflow: investor requests -> admin approves or rejects.
 * Unlike Withdrawal there is no separate "complete" step — approval IS
 * the confirmation that cash arrived (the reserved-funds/completion split
 * withdrawals need doesn't apply here, since nothing needs to be locked
 * before the money is even confirmed), so approval posts the GL journal
 * and credits the wallet directly. Rejection never touches the ledger,
 * so a rejected deposit is provably never effective.
 */
@Injectable()
export class DepositsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly journalService: JournalService,
    private readonly auditService: AuditService,
  ) {}

  async request(dto: RequestDepositDto, actorId: string) {
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

    const existing = await this.prisma.deposit.findUnique({ where: { paymentReference: dto.paymentReference } });
    if (existing) {
      return existing;
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const deposit = await tx.deposit.create({
          data: {
            depositNumber: await generateReferenceNumber(tx, 'DEP'),
            investorId: dto.investorId,
            amount,
            currency: dto.currency,
            paymentReference: dto.paymentReference,
            status: 'PENDING',
            requestedById: actorId,
          },
        });

        await this.auditService.record(
          {
            actorId,
            action: 'REQUEST_DEPOSIT',
            entityType: 'Deposit',
            entityId: deposit.id,
            after: { amount: amount.toString(), status: 'PENDING' },
          },
          tx,
        );

        return deposit;
      });
    } catch (err) {
      // Race: two concurrent requests with the same payment reference.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const raced = await this.prisma.deposit.findUnique({ where: { paymentReference: dto.paymentReference } });
        if (raced) {
          return raced;
        }
      }
      throw err;
    }
  }

  async approve(depositId: string, approverId: string) {
    return this.prisma.$transaction(async (tx) => {
      const deposit = await tx.deposit.findUniqueOrThrow({ where: { id: depositId } });
      if (deposit.status !== 'PENDING') {
        throw new BadRequestException(`Deposit ${depositId} is not awaiting approval`);
      }
      if (deposit.requestedById === approverId) {
        throw new ForbiddenException('Maker cannot approve their own deposit request (maker-checker)');
      }

      const wallet = await tx.wallet.findUniqueOrThrow({ where: { investorId: deposit.investorId } });

      const journalEntry = await this.journalService.postJournal(
        {
          transactionDate: new Date(),
          transactionType: 'DEPOSIT',
          referenceType: 'DEPOSIT',
          referenceId: deposit.id,
          description: `Deposit ${deposit.depositNumber}`,
          currency: deposit.currency,
          createdById: approverId,
          lines: [
            { accountCode: '1010', debit: deposit.amount }, // Dr Bank
            { accountCode: '2010', credit: deposit.amount, investorId: deposit.investorId }, // Cr Investor Wallet Liability
          ],
        },
        tx,
      );

      const walletTransaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          transactionNumber: await generateReferenceNumber(tx, 'TXN'),
          transactionType: 'DEPOSIT',
          direction: 'CREDIT',
          amount: deposit.amount,
          currency: deposit.currency,
          referenceType: 'DEPOSIT',
          referenceId: deposit.id,
          journalEntryId: journalEntry.id,
          status: 'POSTED',
          postedAt: new Date(),
        },
      });

      const updated = await tx.deposit.update({
        where: { id: depositId },
        data: {
          status: 'APPROVED',
          approvedById: approverId,
          approvedAt: new Date(),
          walletTransactionId: walletTransaction.id,
        },
      });

      await this.auditService.record(
        {
          actorId: approverId,
          action: 'APPROVE_DEPOSIT',
          entityType: 'Deposit',
          entityId: depositId,
          before: { status: 'PENDING' },
          after: { status: 'APPROVED' },
        },
        tx,
      );

      return updated;
    });
  }

  async reject(depositId: string, reason: string, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const deposit = await tx.deposit.findUniqueOrThrow({ where: { id: depositId } });
      if (deposit.status !== 'PENDING') {
        throw new BadRequestException(`Deposit ${depositId} is not awaiting approval`);
      }

      const updated = await tx.deposit.update({
        where: { id: depositId },
        data: { status: 'REJECTED', rejectionReason: reason },
      });

      await this.auditService.record(
        {
          actorId,
          action: 'REJECT_DEPOSIT',
          entityType: 'Deposit',
          entityId: depositId,
          before: { status: 'PENDING' },
          after: { status: 'REJECTED' },
          reason,
        },
        tx,
      );

      return updated;
    });
  }

  async findById(id: string) {
    const deposit = await this.prisma.deposit.findUnique({ where: { id } });
    if (!deposit) {
      throw new NotFoundException(`Deposit ${id} not found`);
    }
    return deposit;
  }

  /** Investor's own request history (filtered by investorId) or the admin queue (filtered by status, or both). */
  async findAll(filters: { investorId?: string; status?: DepositStatus }) {
    return this.prisma.deposit.findMany({
      where: {
        investorId: filters.investorId,
        status: filters.status,
      },
      orderBy: { requestedAt: 'desc' },
    });
  }
}
