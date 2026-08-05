import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { formatMoney, sumMoney, toMoney, ZERO } from '../common/money';
import { roiPayableSubledger } from './subledger-balances.util';

const MATURITY_BUCKETS = [
  { label: 'Overdue', maxDays: 0 },
  { label: '0-30 days', maxDays: 30 },
  { label: '31-90 days', maxDays: 90 },
  { label: '91-180 days', maxDays: 180 },
  { label: '181-365 days', maxDays: 365 },
  { label: '365+ days', maxDays: Infinity },
] as const;

/**
 * System-wide KPI aggregation for the admin dashboard (blueprint §23).
 * Computed server-side from the same posted-transaction/active-investment
 * tables the wallet projection and reconciliation engine already query,
 * so the browser never has to fetch every investor's position to total
 * them up client-side.
 */
@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary() {
    const [
      totalInvestors,
      walletCredits,
      walletDebits,
      investedPrincipal,
      roiPaid,
      pendingWithdrawals,
    ] = await Promise.all([
      this.prisma.investor.count(),
      this.prisma.walletTransaction.aggregate({
        where: { status: 'POSTED', direction: 'CREDIT' },
        _sum: { amount: true },
      }),
      this.prisma.walletTransaction.aggregate({
        where: { status: 'POSTED', direction: 'DEBIT' },
        _sum: { amount: true },
      }),
      this.prisma.investment.aggregate({
        where: { status: 'ACTIVE' },
        _sum: { principalAmount: true },
      }),
      this.prisma.walletTransaction.aggregate({
        where: { status: 'POSTED', direction: 'CREDIT', transactionType: 'ROI' },
        _sum: { amount: true },
      }),
      this.prisma.withdrawal.aggregate({
        where: { status: { in: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'PROCESSING'] } },
        _count: true,
        _sum: { amount: true },
      }),
    ]);

    const totalWalletBalance = sumMoney([walletCredits._sum.amount ?? 0]).minus(
      toMoney(walletDebits._sum.amount ?? 0),
    );

    return {
      totalInvestors,
      totalWalletBalance: formatMoney(totalWalletBalance),
      totalInvested: formatMoney(investedPrincipal._sum.principalAmount ?? 0),
      totalRoiPaid: formatMoney(roiPaid._sum.amount ?? 0),
      pendingWithdrawals: {
        count: pendingWithdrawals._count,
        amount: formatMoney(pendingWithdrawals._sum.amount ?? 0),
      },
    };
  }

  /** The fuller "Management reports" set — AUM, ROI accrued, maturity analysis, defaults, cash position. */
  async management() {
    const [base, roiOutstanding, activeInvestments, defaulted, bankAccount] = await Promise.all([
      this.summary(),
      roiPayableSubledger(this.prisma),
      this.prisma.investment.findMany({
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          investmentNumber: true,
          principalAmount: true,
          maturityDate: true,
          investorId: true,
          investor: { select: { investorNumber: true } },
        },
      }),
      this.prisma.investment.findMany({
        where: { status: { in: ['DEFAULTED', 'WRITTEN_OFF'] } },
        select: {
          id: true,
          investmentNumber: true,
          principalAmount: true,
          status: true,
          defaultedAt: true,
          defaultReason: true,
          investorId: true,
          investor: { select: { investorNumber: true } },
        },
        orderBy: { defaultedAt: 'desc' },
      }),
      this.prisma.account.findUnique({ where: { accountCode: '1010' } }),
    ]);

    const totalRoiAccrued = sumMoney(roiOutstanding.map((r) => r.amount));

    const now = Date.now();
    const buckets = MATURITY_BUCKETS.map((b) => ({
      label: b.label,
      count: 0,
      totalPrincipal: ZERO,
      investments: [] as Array<{
        investmentId: string;
        investmentNumber: string;
        investorId: string;
        investorNumber: string;
        principalAmount: string;
        maturityDate: Date;
      }>,
    }));
    for (const inv of activeInvestments) {
      const daysToMaturity = (inv.maturityDate.getTime() - now) / 86_400_000;
      const bucketIndex = MATURITY_BUCKETS.findIndex((b) => daysToMaturity <= b.maxDays);
      const idx = bucketIndex === -1 ? MATURITY_BUCKETS.length - 1 : bucketIndex;
      buckets[idx].count += 1;
      buckets[idx].totalPrincipal = buckets[idx].totalPrincipal.plus(inv.principalAmount);
      buckets[idx].investments.push({
        investmentId: inv.id,
        investmentNumber: inv.investmentNumber,
        investorId: inv.investorId,
        investorNumber: inv.investor.investorNumber,
        principalAmount: formatMoney(inv.principalAmount),
        maturityDate: inv.maturityDate,
      });
    }

    let cashPosition = ZERO;
    if (bankAccount) {
      const grouped = await this.prisma.journalLine.groupBy({
        by: ['accountId'],
        where: { accountId: bankAccount.id, journalEntry: { status: 'POSTED' } },
        _sum: { debit: true, credit: true },
      });
      const sums = grouped[0];
      cashPosition = toMoney(sums?._sum.debit ?? 0).minus(sums?._sum.credit ?? 0);
    }

    return {
      ...base,
      totalAUM: formatMoney(toMoney(base.totalWalletBalance).plus(base.totalInvested)),
      totalInvestorFunds: base.totalWalletBalance,
      totalInvestments: base.totalInvested,
      totalRoiAccrued: formatMoney(totalRoiAccrued),
      cashPosition: formatMoney(cashPosition),
      maturityAnalysis: buckets.map((b) => ({
        label: b.label,
        count: b.count,
        totalPrincipal: formatMoney(b.totalPrincipal),
        investments: b.investments,
      })),
      defaultedInvestments: {
        count: defaulted.length,
        totalPrincipal: formatMoney(sumMoney(defaulted.map((d) => d.principalAmount))),
        items: defaulted.map((d) => ({
          investmentId: d.id,
          investmentNumber: d.investmentNumber,
          investorId: d.investorId,
          investorNumber: d.investor.investorNumber,
          principalAmount: formatMoney(d.principalAmount),
          status: d.status,
          defaultedAt: d.defaultedAt,
          defaultReason: d.defaultReason,
        })),
      },
    };
  }
}
