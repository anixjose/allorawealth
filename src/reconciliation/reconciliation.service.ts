import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { sumMoney, ZERO } from '../common/money';
import { generateReferenceNumber } from '../common/reference-number';
import {
  glBalancesByInvestor,
  walletLiabilitySubledger,
  investmentPayableSubledger,
  roiPayableSubledger,
} from '../reports/subledger-balances.util';

/**
 * The three investor-facing control accounts the blueprint's own
 * reconciliation worked example checks (Investor Wallet Liability,
 * Investor Investment Payable, Investor ROI Payable). 2040 (Investor
 * Withdrawal Payable) is seeded in the chart of accounts but never
 * posted to in this slice — withdrawals settle directly against the
 * wallet liability (blueprint §19's own worked example does the same),
 * so there is nothing meaningful to reconcile there yet.
 */
export const CONTROL_ACCOUNT_CODES = ['2010', '2020', '2030'] as const;
export type ControlAccountCode = (typeof CONTROL_ACCOUNT_CODES)[number];

/**
 * Every investor-level balance must reconcile exactly to its General
 * Ledger control account. This service computes the GL side from
 * `journal_lines` (posted only) and the sub-ledger side independently
 * from the business tables (`wallet_transactions`, `investments`,
 * `repayment_schedules`/`repayments`) — never from the journal itself,
 * otherwise the check would be circular. A non-zero difference is
 * always written as an EXCEPTION; nothing here ever auto-corrects.
 */
@Injectable()
export class ReconciliationService {
  constructor(private readonly prisma: PrismaService) {}

  async run(preparedById: string) {
    const reconciliationDate = new Date();
    const results = [];

    for (const accountCode of CONTROL_ACCOUNT_CODES) {
      const account = await this.prisma.account.findUnique({ where: { accountCode } });
      if (!account) {
        throw new NotFoundException(`Account ${accountCode} not found — was the chart of accounts seeded?`);
      }

      const [glByInvestor, subledgerByInvestor] = await Promise.all([
        glBalancesByInvestor(this.prisma, account.id),
        this.subledgerBalancesByInvestor(accountCode),
      ]);

      const glMap = new Map(glByInvestor.map((x) => [x.investorId, x.amount]));
      const subledgerMap = new Map(subledgerByInvestor.map((x) => [x.investorId, x.amount]));
      const allInvestorIds = new Set([...glMap.keys(), ...subledgerMap.keys()]);

      const glBalance = sumMoney(glByInvestor.map((x) => x.amount));
      const subledgerBalance = sumMoney(subledgerByInvestor.map((x) => x.amount));
      const difference = glBalance.minus(subledgerBalance);

      const reconciliation = await this.prisma.investorGlReconciliation.create({
        data: {
          reconciliationNumber: await generateReferenceNumber(this.prisma, 'REC'),
          reconciliationDate,
          accountId: account.id,
          currency: 'INR',
          glBalance,
          subledgerBalance,
          difference,
          status: difference.isZero() ? 'RECONCILED' : 'EXCEPTION',
          preparedById,
        },
      });

      const items = [];
      for (const investorId of allInvestorIds) {
        const glAmount = glMap.get(investorId) ?? ZERO;
        const subledgerAmount = subledgerMap.get(investorId) ?? ZERO;
        const itemDifference = glAmount.minus(subledgerAmount);
        if (!itemDifference.isZero()) {
          items.push(
            await this.prisma.investorGlReconciliationItem.create({
              data: {
                reconciliationId: reconciliation.id,
                investorId,
                accountId: account.id,
                glAmount,
                subledgerAmount,
                difference: itemDifference,
                exceptionType: 'UNCLASSIFIED',
                status: 'OPEN',
              },
            }),
          );
        }
      }

      results.push({ ...reconciliation, items });
    }

    return results;
  }

  async findAll() {
    return this.prisma.investorGlReconciliation.findMany({
      include: { account: true },
      orderBy: { reconciliationDate: 'desc' },
    });
  }

  async findItems(reconciliationId: string) {
    return this.prisma.investorGlReconciliationItem.findMany({
      where: { reconciliationId },
      include: { investor: true },
    });
  }

  private async subledgerBalancesByInvestor(accountCode: ControlAccountCode) {
    switch (accountCode) {
      case '2010':
        return walletLiabilitySubledger(this.prisma);
      case '2020':
        return investmentPayableSubledger(this.prisma);
      case '2030':
        return roiPayableSubledger(this.prisma);
    }
  }
}
