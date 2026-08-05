import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toMoney, sumMoney, ZERO, formatMoney, Money } from '../common/money';
import { CONTROL_ACCOUNT_CODES } from '../reconciliation/reconciliation.service';
import {
  glBalancesByInvestor,
  walletLiabilitySubledger,
  investmentPayableSubledger,
  roiPayableSubledger,
} from './subledger-balances.util';

const DEBIT_NORMAL_TYPES = new Set(['ASSET', 'EXPENSE']);

/**
 * The blueprint's "Financial reports" set (§31): Trial Balance, General
 * Ledger, P&L, Balance Sheet, a Cash/Bank "book" (there is no external bank
 * feed integrated, so this is the Bank account's own ledger rather than a
 * reconciliation against a real bank statement), and three investor-facing
 * control-account reports. Everything here is "as of now" — full posted
 * history to date, no date-range filtering in this pass.
 */
@Injectable()
export class FinancialReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async trialBalance() {
    const [accounts, grouped] = await Promise.all([
      this.prisma.account.findMany({ orderBy: { accountCode: 'asc' } }),
      this.prisma.journalLine.groupBy({
        by: ['accountId'],
        where: { journalEntry: { status: 'POSTED' } },
        _sum: { debit: true, credit: true },
      }),
    ]);

    const byAccountId = new Map(grouped.map((g) => [g.accountId, g]));
    const rows = accounts.map((account) => {
      const sums = byAccountId.get(account.id);
      const totalDebit = toMoney(sums?._sum.debit ?? 0);
      const totalCredit = toMoney(sums?._sum.credit ?? 0);
      return {
        accountCode: account.accountCode,
        accountName: account.accountName,
        accountType: account.accountType,
        totalDebit: formatMoney(totalDebit),
        totalCredit: formatMoney(totalCredit),
      };
    });

    const totalDebit = sumMoney(rows.map((r) => r.totalDebit));
    const totalCredit = sumMoney(rows.map((r) => r.totalCredit));

    return {
      rows,
      totalDebit: formatMoney(totalDebit),
      totalCredit: formatMoney(totalCredit),
      balanced: totalDebit.equals(totalCredit),
    };
  }

  async generalLedger(accountCode: string) {
    return this.accountLedger(accountCode);
  }

  /** Bank account (1010) ledger — an internal cash book, not a reconciliation against an external bank statement. */
  async cashBook() {
    return this.accountLedger('1010');
  }

  async profitAndLoss() {
    const [incomeAccounts, expenseAccounts] = await Promise.all([
      this.accountBalancesByType('INCOME'),
      this.accountBalancesByType('EXPENSE'),
    ]);

    const totalIncome = sumMoney(incomeAccounts.map((a) => a.balance));
    const totalExpense = sumMoney(expenseAccounts.map((a) => a.balance));

    return {
      income: incomeAccounts.map((a) => ({ ...a, balance: formatMoney(a.balance) })),
      expense: expenseAccounts.map((a) => ({ ...a, balance: formatMoney(a.balance) })),
      totalIncome: formatMoney(totalIncome),
      totalExpense: formatMoney(totalExpense),
      netProfit: formatMoney(totalIncome.minus(totalExpense)),
    };
  }

  async balanceSheet() {
    const [assets, liabilities, equity] = await Promise.all([
      this.accountBalancesByType('ASSET'),
      this.accountBalancesByType('LIABILITY'),
      this.accountBalancesByType('EQUITY'),
    ]);

    const totalAssets = sumMoney(assets.map((a) => a.balance));
    const totalLiabilities = sumMoney(liabilities.map((a) => a.balance));
    const totalEquity = sumMoney(equity.map((a) => a.balance));

    return {
      assets: assets.map((a) => ({ ...a, balance: formatMoney(a.balance) })),
      liabilities: liabilities.map((a) => ({ ...a, balance: formatMoney(a.balance) })),
      equity: equity.map((a) => ({ ...a, balance: formatMoney(a.balance) })),
      totalAssets: formatMoney(totalAssets),
      totalLiabilities: formatMoney(totalLiabilities),
      totalEquity: formatMoney(totalEquity),
      balanced: totalAssets.equals(totalLiabilities.plus(totalEquity)),
    };
  }

  async investorLiabilities() {
    const [wallet, investment, roi, investorNumberById] = await Promise.all([
      walletLiabilitySubledger(this.prisma),
      investmentPayableSubledger(this.prisma),
      roiPayableSubledger(this.prisma),
      this.investorNumberMap(),
    ]);

    const walletMap = new Map(wallet.map((x) => [x.investorId, x.amount]));
    const investmentMap = new Map(investment.map((x) => [x.investorId, x.amount]));
    const roiMap = new Map(roi.map((x) => [x.investorId, x.amount]));
    const allInvestorIds = new Set([...walletMap.keys(), ...investmentMap.keys(), ...roiMap.keys()]);

    const rows = Array.from(allInvestorIds).map((investorId) => {
      const walletLiability = walletMap.get(investorId) ?? ZERO;
      const investmentPayable = investmentMap.get(investorId) ?? ZERO;
      const roiPayable = roiMap.get(investorId) ?? ZERO;
      return {
        investorId,
        investorNumber: investorNumberById.get(investorId) ?? investorId,
        walletLiability: formatMoney(walletLiability),
        investmentPayable: formatMoney(investmentPayable),
        roiPayable: formatMoney(roiPayable),
        total: formatMoney(walletLiability.plus(investmentPayable).plus(roiPayable)),
      };
    });

    return { rows, controlAccounts: CONTROL_ACCOUNT_CODES };
  }

  async investorRoi() {
    const accruedSchedules = await this.prisma.repaymentSchedule.findMany({
      where: { roiAccruedAt: { not: null } },
      select: { roiDue: true, investment: { select: { investorId: true } } },
    });
    const repayments = await this.prisma.repayment.findMany({
      where: { roiAmount: { gt: 0 } },
      select: { roiAmount: true, investment: { select: { investorId: true } } },
    });
    const investorNumberById = await this.investorNumberMap();

    const accruedByInvestor = new Map<string, Money>();
    for (const s of accruedSchedules) {
      const id = s.investment.investorId;
      accruedByInvestor.set(id, (accruedByInvestor.get(id) ?? ZERO).plus(s.roiDue));
    }
    const receivedByInvestor = new Map<string, Money>();
    for (const r of repayments) {
      const id = r.investment.investorId;
      receivedByInvestor.set(id, (receivedByInvestor.get(id) ?? ZERO).plus(r.roiAmount));
    }

    const allInvestorIds = new Set([...accruedByInvestor.keys(), ...receivedByInvestor.keys()]);
    const rows = Array.from(allInvestorIds).map((investorId) => {
      const accrued = accruedByInvestor.get(investorId) ?? ZERO;
      const received = receivedByInvestor.get(investorId) ?? ZERO;
      return {
        investorId,
        investorNumber: investorNumberById.get(investorId) ?? investorId,
        accrued: formatMoney(accrued),
        received: formatMoney(received),
        outstanding: formatMoney(accrued.minus(received)),
      };
    });

    return { rows };
  }

  /** Investment Receivable (1030), per investment — independent of the ROI-accrual-based figure above (computed from the GL instead of source tables). */
  async investmentReceivables() {
    const account = await this.getAccountOrThrow('1030');
    const lines = await this.prisma.journalLine.findMany({
      where: { accountId: account.id, investmentId: { not: null }, journalEntry: { status: 'POSTED' } },
      select: {
        debit: true,
        credit: true,
        investmentId: true,
        investment: { select: { investmentNumber: true, investorId: true } },
      },
    });

    const investorNumberById = await this.investorNumberMap();
    const byInvestment = new Map<string, { investmentNumber: string; investorId: string; net: Money }>();
    for (const line of lines) {
      const id = line.investmentId!;
      const existing = byInvestment.get(id);
      const net = toMoney(line.debit).minus(line.credit);
      if (existing) {
        existing.net = existing.net.plus(net);
      } else {
        byInvestment.set(id, {
          investmentNumber: line.investment!.investmentNumber,
          investorId: line.investment!.investorId,
          net,
        });
      }
    }

    const rows = Array.from(byInvestment.entries())
      .map(([investmentId, v]) => ({
        investmentId,
        investmentNumber: v.investmentNumber,
        investorId: v.investorId,
        investorNumber: investorNumberById.get(v.investorId) ?? v.investorId,
        outstandingReceivable: formatMoney(v.net),
      }))
      .filter((row) => row.outstandingReceivable !== '0.00');

    return { rows };
  }

  private async accountBalancesByType(accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE') {
    const accounts = await this.prisma.account.findMany({ where: { accountType }, orderBy: { accountCode: 'asc' } });
    const grouped = await this.prisma.journalLine.groupBy({
      by: ['accountId'],
      where: { accountId: { in: accounts.map((a) => a.id) }, journalEntry: { status: 'POSTED' } },
      _sum: { debit: true, credit: true },
    });
    const byAccountId = new Map(grouped.map((g) => [g.accountId, g]));
    const normalDebit = DEBIT_NORMAL_TYPES.has(accountType);

    return accounts.map((account) => {
      const sums = byAccountId.get(account.id);
      const debit = toMoney(sums?._sum.debit ?? 0);
      const credit = toMoney(sums?._sum.credit ?? 0);
      const balance = normalDebit ? debit.minus(credit) : credit.minus(debit);
      return { accountCode: account.accountCode, accountName: account.accountName, balance };
    });
  }

  private async accountLedger(accountCode: string) {
    const account = await this.getAccountOrThrow(accountCode);
    const normalDebit = DEBIT_NORMAL_TYPES.has(account.accountType);

    const lines = await this.prisma.journalLine.findMany({
      where: { accountId: account.id, journalEntry: { status: 'POSTED' } },
      include: { journalEntry: true, investor: { select: { investorNumber: true } } },
      orderBy: [{ journalEntry: { transactionDate: 'asc' } }, { journalEntry: { createdAt: 'asc' } }],
    });

    let running = ZERO;
    const rows = lines.map((line) => {
      const delta = normalDebit ? toMoney(line.debit).minus(line.credit) : toMoney(line.credit).minus(line.debit);
      running = running.plus(delta);
      return {
        date: line.journalEntry.transactionDate,
        journalNumber: line.journalEntry.journalNumber,
        transactionType: line.journalEntry.transactionType,
        description: line.journalEntry.description,
        investorId: line.investorId,
        investorNumber: line.investor?.investorNumber ?? null,
        debit: formatMoney(line.debit),
        credit: formatMoney(line.credit),
        runningBalance: formatMoney(running),
      };
    });

    return {
      account: { accountCode: account.accountCode, accountName: account.accountName, accountType: account.accountType },
      lines: rows,
      endingBalance: formatMoney(running),
    };
  }

  private async getAccountOrThrow(accountCode: string) {
    const account = await this.prisma.account.findUnique({ where: { accountCode } });
    if (!account) {
      throw new NotFoundException(`Account ${accountCode} not found`);
    }
    return account;
  }

  private async investorNumberMap() {
    const investors = await this.prisma.investor.findMany({ select: { id: true, investorNumber: true } });
    return new Map(investors.map((i) => [i.id, i.investorNumber]));
  }
}
