import { Injectable, NotFoundException } from '@nestjs/common';
import { AccountType, ScheduleIIIGroup } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { toMoney, sumMoney, ZERO, formatMoney, Money } from '../common/money';
import { CONTROL_ACCOUNT_CODES } from '../reconciliation/reconciliation.service';
import { SCHEDULE_III_GROUP_LABELS } from './schedule-iii';
import {
  glBalancesByInvestor,
  walletLiabilitySubledger,
  investmentPayableSubledger,
  roiPayableSubledger,
} from './subledger-balances.util';

const DEBIT_NORMAL_TYPES = new Set(['ASSET', 'EXPENSE']);

/**
 * Cash Flow Statement (direct method, AS-3) activity classification for this platform's
 * journal transaction types. Only transaction types that actually post to a Cash and Cash
 * Equivalents account produce a cash flow at all (e.g. principal repayment never touches
 * Bank Account in this ledger today — it's a reclassification between two payable accounts
 * — so it never appears here, which is correct: a cash flow statement only reflects real
 * cash movements).
 *
 * Policy (documented, not something this ledger can infer on its own): this platform lends
 * investor funds to opportunities and collects repayments — functionally an NBFC/lending
 * business — so ROI collected from borrowers is Operating (the core business), while
 * investor deposits/withdrawals are Financing (investors are this fund's capital providers,
 * the same way customer deposits are financing activities for a deposit-taking institution).
 * No Investing activity exists yet in this ledger (no fixed-asset purchases are posted).
 */
const CASH_FLOW_OPERATING_TYPES = new Set(['ROI_RECEIPT']);
const CASH_FLOW_FINANCING_TYPES = new Set(['DEPOSIT', 'WITHDRAWAL']);
const CASH_FLOW_INVESTING_TYPES = new Set<string>([]);

interface LeafAccountBalance {
  accountCode: string;
  accountName: string;
  scheduleIiiGroup: ScheduleIIIGroup;
  balance: Money;
}

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

  /**
   * Statement of Profit and Loss per Schedule III (Division I), Companies Act 2013 — every
   * line always shown, even with a zero balance and no accounts (per the platform owner's
   * request to display the full statutory structure regardless of whether an amount exists).
   * Tax Expense (Current + Deferred) is a real, separately-summed section — if nothing is
   * ever posted to those accounts it's simply zero, rather than being hardcoded.
   */
  async profitAndLoss() {
    const [incomeRows, expenseRows] = await Promise.all([
      this.leafAccountBalancesByType('INCOME'),
      this.leafAccountBalancesByType('EXPENSE'),
    ]);

    const revenueFromOperations = this.groupByScheduleIII(incomeRows, ['REVENUE_FROM_OPERATIONS']);
    const otherIncome = this.groupByScheduleIII(incomeRows, ['OTHER_INCOME']);
    const totalRevenue = sumMoney([revenueFromOperations, otherIncome].map((s) => toMoney(s.total)));

    const costOfMaterialsConsumed = this.groupByScheduleIII(expenseRows, ['COST_OF_MATERIALS_CONSUMED']);
    const purchasesOfStockInTrade = this.groupByScheduleIII(expenseRows, ['PURCHASES_OF_STOCK_IN_TRADE']);
    const changesInInventories = this.groupByScheduleIII(expenseRows, ['CHANGES_IN_INVENTORIES']);
    const employeeBenefitExpense = this.groupByScheduleIII(expenseRows, ['EMPLOYEE_BENEFIT_EXPENSE']);
    const financeCosts = this.groupByScheduleIII(expenseRows, ['FINANCE_COSTS']);
    const depreciationAndAmortization = this.groupByScheduleIII(expenseRows, ['DEPRECIATION_AND_AMORTIZATION_EXPENSE']);
    const otherExpenses = this.groupByScheduleIII(expenseRows, ['OTHER_EXPENSES']);
    const totalExpenses = sumMoney(
      [
        costOfMaterialsConsumed,
        purchasesOfStockInTrade,
        changesInInventories,
        employeeBenefitExpense,
        financeCosts,
        depreciationAndAmortization,
        otherExpenses,
      ].map((s) => toMoney(s.total)),
    );

    const profitBeforeTax = totalRevenue.minus(totalExpenses);

    const currentTax = this.groupByScheduleIII(expenseRows, ['CURRENT_TAX_EXPENSE']);
    const deferredTax = this.groupByScheduleIII(expenseRows, ['DEFERRED_TAX_EXPENSE']);
    const totalTax = sumMoney([currentTax, deferredTax].map((s) => toMoney(s.total)));
    const profitForThePeriod = profitBeforeTax.minus(totalTax);

    return {
      revenueFromOperations,
      otherIncome,
      totalRevenue: formatMoney(totalRevenue),
      costOfMaterialsConsumed,
      purchasesOfStockInTrade,
      changesInInventories,
      employeeBenefitExpense,
      financeCosts,
      depreciationAndAmortization,
      otherExpenses,
      totalExpenses: formatMoney(totalExpenses),
      profitBeforeTax: formatMoney(profitBeforeTax),
      currentTax,
      deferredTax,
      totalTax: formatMoney(totalTax),
      profitForThePeriod: formatMoney(profitForThePeriod),
    };
  }

  /**
   * Balance Sheet per Schedule III (Division I) vertical format — Equity and Liabilities,
   * then Assets. Every sub-head is always shown, even with zero accounts/balance.
   */
  async balanceSheet() {
    const [assetRows, liabilityRows, equityRows] = await Promise.all([
      this.leafAccountBalancesByType('ASSET'),
      this.leafAccountBalancesByType('LIABILITY'),
      this.leafAccountBalancesByType('EQUITY'),
    ]);

    const shareholdersFunds = this.groupByScheduleIII(equityRows, ['SHARE_CAPITAL', 'RESERVES_AND_SURPLUS']);
    const shareApplicationMoney = this.groupByScheduleIII(equityRows, ['SHARE_APPLICATION_MONEY']);
    const nonCurrentLiabilities = this.groupByScheduleIII(liabilityRows, [
      'LONG_TERM_BORROWINGS',
      'DEFERRED_TAX_LIABILITIES',
      'OTHER_LONG_TERM_LIABILITIES',
      'LONG_TERM_PROVISIONS',
    ]);
    const currentLiabilities = this.groupByScheduleIII(liabilityRows, [
      'SHORT_TERM_BORROWINGS',
      'TRADE_PAYABLES',
      'OTHER_CURRENT_LIABILITIES',
      'SHORT_TERM_PROVISIONS',
    ]);
    const nonCurrentAssets = this.groupByScheduleIII(assetRows, [
      'TANGIBLE_ASSETS',
      'INTANGIBLE_ASSETS',
      'CAPITAL_WORK_IN_PROGRESS',
      'INTANGIBLE_ASSETS_UNDER_DEVELOPMENT',
      'NON_CURRENT_INVESTMENTS',
      'DEFERRED_TAX_ASSETS',
      'LONG_TERM_LOANS_AND_ADVANCES',
      'OTHER_NON_CURRENT_ASSETS',
    ]);
    const currentAssets = this.groupByScheduleIII(assetRows, [
      'CURRENT_INVESTMENTS',
      'INVENTORIES',
      'TRADE_RECEIVABLES',
      'CASH_AND_CASH_EQUIVALENTS',
      'SHORT_TERM_LOANS_AND_ADVANCES',
      'OTHER_CURRENT_ASSETS',
    ]);

    const totalEquityAndLiabilities = sumMoney(
      [shareholdersFunds, shareApplicationMoney, nonCurrentLiabilities, currentLiabilities].map((s) => toMoney(s.total)),
    );
    const totalAssets = sumMoney([nonCurrentAssets, currentAssets].map((s) => toMoney(s.total)));

    return {
      equityAndLiabilities: {
        shareholdersFunds,
        shareApplicationMoney,
        nonCurrentLiabilities,
        currentLiabilities,
        total: formatMoney(totalEquityAndLiabilities),
      },
      assets: {
        nonCurrentAssets,
        currentAssets,
        total: formatMoney(totalAssets),
      },
      balanced: totalEquityAndLiabilities.equals(totalAssets),
    };
  }

  /**
   * Cash Flow Statement (direct method) — every posted journal line that touches a Cash and
   * Cash Equivalents account, grouped by transaction type and classified into Operating,
   * Investing, and Financing activities (see the classification constants above for the
   * documented policy). "Since inception" convention matching the rest of this report suite
   * (no date-range filtering): cash at the beginning is zero, cash at the end is the net
   * increase in cash. `reconciled` cross-checks that figure against the Cash and Cash
   * Equivalents accounts' actual ledger balance — if they ever diverge, it means a new
   * transaction type started touching cash without being classified here.
   */
  async cashFlowStatement() {
    const cashAccounts = await this.prisma.account.findMany({
      where: { scheduleIiiGroup: 'CASH_AND_CASH_EQUIVALENTS', status: 'ACTIVE', childAccounts: { none: {} } },
      select: { id: true },
    });
    const cashAccountIds = cashAccounts.map((a) => a.id);

    const lines = await this.prisma.journalLine.findMany({
      where: { accountId: { in: cashAccountIds }, journalEntry: { status: 'POSTED' } },
      select: { debit: true, credit: true, journalEntry: { select: { transactionType: true } } },
    });

    const netByType = new Map<string, Money>();
    for (const line of lines) {
      const type = line.journalEntry.transactionType;
      // Cash is debit-normal: a debit is cash received, a credit is cash paid out.
      const net = toMoney(line.debit).minus(line.credit);
      netByType.set(type, (netByType.get(type) ?? ZERO).plus(net));
    }

    const knownTypes = new Set([...CASH_FLOW_OPERATING_TYPES, ...CASH_FLOW_INVESTING_TYPES, ...CASH_FLOW_FINANCING_TYPES]);
    const unclassifiedTypes = new Set(Array.from(netByType.keys()).filter((t) => !knownTypes.has(t)));

    const buildActivity = (types: Set<string>, label: string) => {
      const items = Array.from(netByType.entries())
        .filter(([type]) => types.has(type))
        .map(([transactionType, amount]) => ({ transactionType, amount: formatMoney(amount) }));
      return { label, items, total: formatMoney(sumMoney(items.map((i) => toMoney(i.amount)))) };
    };

    const operatingActivities = buildActivity(CASH_FLOW_OPERATING_TYPES, 'Operating Activities');
    const investingActivities = buildActivity(CASH_FLOW_INVESTING_TYPES, 'Investing Activities');
    const financingActivities = buildActivity(CASH_FLOW_FINANCING_TYPES, 'Financing Activities');
    const unclassifiedActivities = buildActivity(unclassifiedTypes, 'Unclassified Activities');

    const netIncreaseInCash = sumMoney(
      [operatingActivities, investingActivities, financingActivities, unclassifiedActivities].map((a) => toMoney(a.total)),
    );

    const assetRows = await this.leafAccountBalancesByType('ASSET');
    const actualCashBalance = sumMoney(
      assetRows.filter((r) => r.scheduleIiiGroup === 'CASH_AND_CASH_EQUIVALENTS').map((r) => r.balance),
    );

    return {
      operatingActivities,
      investingActivities,
      financingActivities,
      unclassifiedActivities,
      netIncreaseInCash: formatMoney(netIncreaseInCash),
      cashAtBeginning: formatMoney(ZERO),
      cashAtEnd: formatMoney(netIncreaseInCash),
      reconciled: netIncreaseInCash.equals(actualCashBalance),
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

  /**
   * Leaf accounts only (no children) — header/rollup accounts like "1000 ASSETS" never
   * receive postings directly. Deactivated accounts are excluded from these statutory
   * reports entirely (an account can only be deactivated once it has no transactions, so
   * dropping it here never hides a real balance).
   */
  private async leafAccountBalancesByType(accountType: AccountType): Promise<LeafAccountBalance[]> {
    const accounts = await this.prisma.account.findMany({
      where: { accountType, status: 'ACTIVE', childAccounts: { none: {} } },
      orderBy: { accountCode: 'asc' },
    });
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
      return {
        accountCode: account.accountCode,
        accountName: account.accountName,
        scheduleIiiGroup: account.scheduleIiiGroup,
        balance,
      };
    });
  }

  /** Builds one Schedule III section (e.g. "Current Liabilities") from its constituent groups — every group is always shown, even with no accounts/zero balance. */
  private groupByScheduleIII(rows: LeafAccountBalance[], groups: ScheduleIIIGroup[]) {
    const items = groups.map((group) => {
      const accounts = rows.filter((r) => r.scheduleIiiGroup === group);
      return {
        group,
        label: SCHEDULE_III_GROUP_LABELS[group],
        accounts: accounts.map((a) => ({ accountCode: a.accountCode, accountName: a.accountName, balance: formatMoney(a.balance) })),
        total: formatMoney(sumMoney(accounts.map((a) => a.balance))),
      };
    });

    return { items, total: formatMoney(sumMoney(items.map((i) => toMoney(i.total)))) };
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
