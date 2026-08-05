import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService, PrismaTransactionClient } from '../audit/audit.service';
import { sumMoney, toMoney, ZERO } from '../common/money';
import { generateReferenceNumber } from '../common/reference-number';
import { UnbalancedJournalException } from './exceptions/unbalanced-journal.exception';
import { InvalidJournalLineException } from './exceptions/invalid-journal-line.exception';

export interface JournalLineInput {
  accountCode: string;
  investorId?: string;
  investmentId?: string;
  debit?: Prisma.Decimal.Value;
  credit?: Prisma.Decimal.Value;
}

export interface PostJournalInput {
  transactionDate: Date;
  transactionType: string;
  referenceType: string;
  referenceId: string;
  description?: string;
  currency: string;
  lines: JournalLineInput[];
  createdById: string;
  /** Maker-checker: manual adjustments/reversals require a separate approval step. */
  requiresApproval?: boolean;
}

/**
 * The ledger engine — the only code path in the application allowed to
 * write to `journal_lines`. Every money-moving module (deposits,
 * investments, repayments, withdrawals) posts through here rather than
 * touching ledger tables directly (blueprint §12–14, §32).
 */
@Injectable()
export class JournalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Posts a balanced double-entry journal. If `client` is supplied, the
   * write joins the caller's own transaction (e.g. investments module
   * creating the investment row and its journal atomically); otherwise a
   * new transaction is opened here.
   */
  async postJournal(input: PostJournalInput, client?: PrismaTransactionClient) {
    this.validateLines(input.lines, input.currency);

    const run = async (tx: PrismaTransactionClient) => {
      const accountsByCode = await this.resolveAccounts(
        tx,
        input.lines.map((l) => l.accountCode),
      );

      const status = input.requiresApproval ? 'PENDING_APPROVAL' : 'POSTED';
      const journalNumber = await generateReferenceNumber(tx, 'JRN');

      const entry = await tx.journalEntry.create({
        data: {
          journalNumber,
          transactionDate: input.transactionDate,
          transactionType: input.transactionType,
          referenceType: input.referenceType,
          referenceId: input.referenceId,
          description: input.description,
          status,
          createdById: input.createdById,
          postedAt: status === 'POSTED' ? new Date() : null,
        },
      });

      await tx.journalLine.createMany({
        data: input.lines.map((line) => ({
          journalEntryId: entry.id,
          accountId: accountsByCode.get(line.accountCode)!,
          investorId: line.investorId,
          investmentId: line.investmentId,
          debit: toMoney(line.debit ?? 0),
          credit: toMoney(line.credit ?? 0),
          currency: input.currency,
        })),
      });

      await this.auditService.record(
        {
          actorId: input.createdById,
          action: 'POST_JOURNAL',
          entityType: 'JournalEntry',
          entityId: entry.id,
          after: {
            journalNumber,
            transactionType: input.transactionType,
            status,
            lines: input.lines.map((l) => ({
              accountCode: l.accountCode,
              debit: l.debit?.toString() ?? '0',
              credit: l.credit?.toString() ?? '0',
            })),
          },
        },
        tx,
      );

      return tx.journalEntry.findUniqueOrThrow({
        where: { id: entry.id },
        include: { lines: true },
      });
    };

    if (client) {
      return run(client);
    }
    return this.prisma.$transaction((tx) => run(tx));
  }

  /**
   * Approves a journal left in PENDING_APPROVAL by a maker-checker rule.
   * Enforces approver != creator.
   */
  async approveJournal(journalEntryId: string, approvedById: string) {
    return this.prisma.$transaction(async (tx) => {
      const entry = await tx.journalEntry.findUniqueOrThrow({ where: { id: journalEntryId } });
      if (entry.status !== 'PENDING_APPROVAL') {
        throw new InvalidJournalLineException(
          `Journal ${entry.journalNumber} is not pending approval`,
        );
      }
      if (entry.createdById === approvedById) {
        throw new InvalidJournalLineException('Maker cannot approve their own journal (maker-checker)');
      }

      const updated = await tx.journalEntry.update({
        where: { id: journalEntryId },
        data: { status: 'POSTED', approvedById, postedAt: new Date() },
      });

      await this.auditService.record(
        {
          actorId: approvedById,
          action: 'APPROVE_JOURNAL',
          entityType: 'JournalEntry',
          entityId: journalEntryId,
          before: { status: 'PENDING_APPROVAL' },
          after: { status: 'POSTED' },
        },
        tx,
      );

      return updated;
    });
  }

  private validateLines(lines: JournalLineInput[], currency: string) {
    if (lines.length < 2) {
      throw new InvalidJournalLineException('A journal requires at least two lines');
    }

    for (const line of lines) {
      const debit = toMoney(line.debit ?? 0);
      const credit = toMoney(line.credit ?? 0);
      if (debit.isNegative() || credit.isNegative()) {
        throw new InvalidJournalLineException('debit/credit cannot be negative');
      }
      if (!debit.isZero() && !credit.isZero()) {
        throw new InvalidJournalLineException(
          `line for account ${line.accountCode} has both debit and credit set`,
        );
      }
      if (debit.isZero() && credit.isZero()) {
        throw new InvalidJournalLineException(
          `line for account ${line.accountCode} has neither debit nor credit set`,
        );
      }
    }

    const totalDebit = sumMoney(lines.map((l) => l.debit ?? 0));
    const totalCredit = sumMoney(lines.map((l) => l.credit ?? 0));

    if (!totalDebit.equals(totalCredit)) {
      throw new UnbalancedJournalException(totalDebit.toString(), totalCredit.toString(), currency);
    }
    if (totalDebit.equals(ZERO)) {
      throw new InvalidJournalLineException('journal total cannot be zero');
    }
  }

  private async resolveAccounts(client: PrismaTransactionClient, codes: string[]) {
    const uniqueCodes = Array.from(new Set(codes));
    const accounts = await client.account.findMany({
      where: { accountCode: { in: uniqueCodes } },
    });
    const byCode = new Map(accounts.map((a) => [a.accountCode, a.id]));
    for (const code of uniqueCodes) {
      if (!byCode.has(code)) {
        throw new InvalidJournalLineException(`unknown account code ${code}`);
      }
    }
    return byCode;
  }
}
