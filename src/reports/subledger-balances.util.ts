import { PrismaService } from '../prisma/prisma.service';
import { toMoney, ZERO, Money } from '../common/money';

export interface InvestorAmount {
  investorId: string;
  amount: Money;
}

/**
 * Repayment statuses that mean "the investor's wallet has actually been
 * credited for this". DISBURSED is the current value; POSTED is the legacy
 * value every repayment used before the record/disburse split existed —
 * those old rows were fully processed (wallet credited, GL posted) in one
 * atomic step, so they must count as disbursed too, or historical data
 * would misreport as still-outstanding against a GL that already cleared it.
 */
const DISBURSED_STATUSES = ['POSTED', 'DISBURSED'] as const;

/**
 * Independent, per-investor balance computations for the three investor
 * control accounts — used by both the GL↔sub-ledger reconciliation
 * (`ReconciliationService`) and the Investor Liability financial report.
 * Deliberately computed from business tables (`wallet_transactions`,
 * `investments`, `repayment_schedules`/`repayments`), never from
 * `journal_lines` itself, so a cross-check against the GL is meaningful
 * rather than circular.
 */

/** 2010 Investor Wallet Liability — net posted wallet_transactions per investor. */
export async function walletLiabilitySubledger(prisma: PrismaService): Promise<InvestorAmount[]> {
  const wallets = await prisma.wallet.findMany({ select: { id: true, investorId: true } });
  const walletToInvestor = new Map(wallets.map((w) => [w.id, w.investorId]));

  const grouped = await prisma.walletTransaction.groupBy({
    by: ['walletId', 'direction'],
    where: { status: 'POSTED' },
    _sum: { amount: true },
  });

  const byInvestor = new Map<string, Money>();
  for (const row of grouped) {
    const investorId = walletToInvestor.get(row.walletId);
    if (!investorId) continue;
    const signedAmount =
      row.direction === 'CREDIT' ? toMoney(row._sum.amount ?? 0) : toMoney(row._sum.amount ?? 0).negated();
    byInvestor.set(investorId, (byInvestor.get(investorId) ?? ZERO).plus(signedAmount));
  }
  return Array.from(byInvestor.entries()).map(([investorId, amount]) => ({ investorId, amount }));
}

/**
 * 2020 Investor Investment Payable — principal not yet DISBURSED to the
 * investor's wallet. Deliberately keyed off disbursed repayments, not
 * `Investment.status`: an investment closes (status CLOSED) as soon as its
 * principal repayment is *recorded* — i.e. the company's obligation is
 * fulfilled — which can happen before that cash is pushed to the investor's
 * wallet. The GL only debits 2020 at disbursement, so this must too, or a
 * closed-but-undisbursed investment would falsely read as zero payable
 * here while the GL still carries the full liability. Includes DEFAULTED
 * investments: defaulting is a status flag only (no reversing journal
 * entry in this slice, see `markDefaulted`), so the liability is still on
 * the books. Only WRITTEN_OFF (a formal loss recognition, not implemented
 * yet) would drop out.
 */
export async function investmentPayableSubledger(prisma: PrismaService): Promise<InvestorAmount[]> {
  const investments = await prisma.investment.findMany({
    where: { status: { not: 'WRITTEN_OFF' } },
    select: { id: true, investorId: true, principalAmount: true },
  });
  if (investments.length === 0) return [];

  const disbursedByInvestment = await prisma.repayment.groupBy({
    by: ['investmentId'],
    where: { investmentId: { in: investments.map((i) => i.id) }, status: { in: [...DISBURSED_STATUSES] } },
    _sum: { principalAmount: true },
  });
  const disbursedMap = new Map(
    disbursedByInvestment.map((r) => [r.investmentId, toMoney(r._sum.principalAmount ?? 0)]),
  );

  const byInvestor = new Map<string, Money>();
  for (const inv of investments) {
    const disbursed = disbursedMap.get(inv.id) ?? ZERO;
    const outstanding = toMoney(inv.principalAmount).minus(disbursed);
    byInvestor.set(inv.investorId, (byInvestor.get(inv.investorId) ?? ZERO).plus(outstanding));
  }
  return Array.from(byInvestor.entries()).map(([investorId, amount]) => ({ investorId, amount }));
}

/**
 * 2030 Investor ROI Payable — accrued ROI not yet DISBURSED to the
 * investor's wallet. Only DISBURSED repayments reduce this (not merely
 * RECEIVED ones) — recording a repayment clears the Investment Receivable
 * but the GL only debits 2030 once the wallet is actually credited.
 */
export async function roiPayableSubledger(prisma: PrismaService): Promise<InvestorAmount[]> {
  const accruedSchedules = await prisma.repaymentSchedule.findMany({
    where: { roiAccruedAt: { not: null } },
    select: { id: true, roiDue: true, investment: { select: { investorId: true } } },
  });
  if (accruedSchedules.length === 0) return [];

  const repaymentsByScheduleId = await prisma.repayment.groupBy({
    by: ['scheduleId'],
    where: { scheduleId: { in: accruedSchedules.map((s) => s.id) }, status: { in: [...DISBURSED_STATUSES] } },
    _sum: { roiAmount: true },
  });
  const paidByScheduleId = new Map(
    repaymentsByScheduleId.map((r) => [r.scheduleId as string, toMoney(r._sum.roiAmount ?? 0)]),
  );

  const byInvestor = new Map<string, Money>();
  for (const schedule of accruedSchedules) {
    const paid = paidByScheduleId.get(schedule.id) ?? ZERO;
    const outstanding = toMoney(schedule.roiDue).minus(paid);
    const investorId = schedule.investment.investorId;
    byInvestor.set(investorId, (byInvestor.get(investorId) ?? ZERO).plus(outstanding));
  }
  return Array.from(byInvestor.entries()).map(([investorId, amount]) => ({ investorId, amount }));
}

/** Posted journal_lines for one account, net (credit-debit) per investor. */
export async function glBalancesByInvestor(prisma: PrismaService, accountId: string): Promise<InvestorAmount[]> {
  const lines = await prisma.journalLine.findMany({
    where: {
      accountId,
      investorId: { not: null },
      journalEntry: { status: 'POSTED' },
    },
    select: { investorId: true, debit: true, credit: true },
  });

  const byInvestor = new Map<string, Money>();
  for (const line of lines) {
    const investorId = line.investorId!;
    const net = toMoney(line.credit).minus(line.debit);
    byInvestor.set(investorId, (byInvestor.get(investorId) ?? ZERO).plus(net));
  }
  return Array.from(byInvestor.entries()).map(([investorId, amount]) => ({ investorId, amount }));
}
