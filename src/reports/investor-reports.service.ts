import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toMoney, ZERO, formatMoney } from '../common/money';

/**
 * Per-investor statements (blueprint §21 and the "Investor reports" list).
 * Wallet statement, Investment statement, and Withdrawal statement are
 * deliberately not duplicated here — they're already correctly served by
 * `GET /wallets/:id/transactions`, `GET /investments?investorId=`, and
 * `GET /withdrawals?investorId=` respectively.
 */
@Injectable()
export class InvestorReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Combined chronological statement with a running balance — the blueprint §21 Date/Transaction/Debit/Credit/Balance table. */
  async investorStatement(investorId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { investorId } });
    if (!wallet) return { rows: [] };

    const transactions = await this.prisma.walletTransaction.findMany({
      where: { walletId: wallet.id, status: 'POSTED' },
      orderBy: [{ postedAt: 'asc' }, { createdAt: 'asc' }],
    });

    let balance = ZERO;
    const rows = transactions.map((tx) => {
      const delta = tx.direction === 'CREDIT' ? toMoney(tx.amount) : toMoney(tx.amount).negated();
      balance = balance.plus(delta);
      return {
        date: tx.postedAt ?? tx.createdAt,
        transactionType: tx.transactionType,
        debit: tx.direction === 'DEBIT' ? formatMoney(tx.amount) : null,
        credit: tx.direction === 'CREDIT' ? formatMoney(tx.amount) : null,
        balance: formatMoney(balance),
      };
    });

    return { rows };
  }

  /** Chronological merge of ROI accrual events and ROI receipt events for one investor. */
  async roiStatement(investorId: string) {
    const [accruedSchedules, receipts] = await Promise.all([
      this.prisma.repaymentSchedule.findMany({
        where: { roiAccruedAt: { not: null }, investment: { investorId } },
        select: { roiAccruedAt: true, roiDue: true, investment: { select: { investmentNumber: true } } },
      }),
      this.prisma.repayment.findMany({
        where: { roiAmount: { gt: 0 }, investment: { investorId } },
        select: { paymentDate: true, roiAmount: true, investment: { select: { investmentNumber: true } } },
      }),
    ]);

    const rows = [
      ...accruedSchedules.map((s) => ({
        date: s.roiAccruedAt!,
        type: 'ACCRUED' as const,
        investmentNumber: s.investment.investmentNumber,
        amount: formatMoney(s.roiDue),
      })),
      ...receipts.map((r) => ({
        date: r.paymentDate,
        type: 'RECEIVED' as const,
        investmentNumber: r.investment.investmentNumber,
        amount: formatMoney(r.roiAmount),
      })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

    return { rows };
  }

  /** All repayments (principal + ROI + other) across the investor's investments, chronological. */
  async repaymentStatement(investorId: string) {
    const repayments = await this.prisma.repayment.findMany({
      where: { investment: { investorId } },
      include: { investment: { select: { investmentNumber: true } } },
      orderBy: { paymentDate: 'asc' },
    });

    return {
      rows: repayments.map((r) => ({
        date: r.paymentDate,
        investmentNumber: r.investment.investmentNumber,
        principalAmount: formatMoney(r.principalAmount),
        roiAmount: formatMoney(r.roiAmount),
        otherAmount: formatMoney(r.otherAmount),
        totalAmount: formatMoney(r.totalAmount),
        status: r.status,
      })),
    };
  }
}
