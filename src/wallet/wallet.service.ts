import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaTransactionClient } from '../audit/audit.service';
import { sumMoney, toMoney, formatMoney } from '../common/money';

/**
 * Read-only wallet projection (blueprint §5, §36 — "the wallet is a view
 * of the ledger, not the ledger itself"). Nothing here is stored; every
 * figure is derived live from `wallet_transactions` / `investments` /
 * `repayment_schedules` each time it's requested.
 */
@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  private async getWalletOrThrow(investorId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { investorId } });
    if (!wallet) {
      throw new NotFoundException(`No wallet for investor ${investorId}`);
    }
    return wallet;
  }

  /**
   * Live available-balance query, callable with an explicit transaction
   * client so callers (investments, withdrawals) can check-then-act
   * atomically inside their own DB transaction — closing the race
   * described in blueprint §30 where two concurrent requests could both
   * read a stale balance and over-commit the wallet.
   */
  async computeAvailableBalance(walletId: string, client: PrismaTransactionClient = this.prisma) {
    const [postedCredits, postedDebits] = await Promise.all([
      client.walletTransaction.aggregate({
        where: { walletId, status: 'POSTED', direction: 'CREDIT' },
        _sum: { amount: true },
      }),
      client.walletTransaction.aggregate({
        where: { walletId, status: 'POSTED', direction: 'DEBIT' },
        _sum: { amount: true },
      }),
    ]);
    return sumMoney([postedCredits._sum.amount ?? 0]).minus(toMoney(postedDebits._sum.amount ?? 0));
  }

  async getPosition(investorId: string) {
    const wallet = await this.getWalletOrThrow(investorId);

    const [availableBalance, pending, investedPrincipal, expectedRoi, realisedRoi] =
      await Promise.all([
        this.computeAvailableBalance(wallet.id),
        this.prisma.walletTransaction.aggregate({
          where: { walletId: wallet.id, status: 'PENDING' },
          _sum: { amount: true },
        }),
        this.prisma.investment.aggregate({
          where: { investorId, status: 'ACTIVE' },
          _sum: { principalAmount: true },
        }),
        this.prisma.repaymentSchedule.aggregate({
          where: {
            status: { in: ['PENDING', 'PARTIALLY_PAID'] },
            investment: { investorId, status: 'ACTIVE' },
          },
          _sum: { roiDue: true },
        }),
        this.prisma.walletTransaction.aggregate({
          where: {
            walletId: wallet.id,
            status: 'POSTED',
            direction: 'CREDIT',
            transactionType: 'ROI',
          },
          _sum: { amount: true },
        }),
      ]);

    const principal = toMoney(investedPrincipal._sum.principalAmount ?? 0);

    return {
      walletId: wallet.id,
      walletNumber: wallet.walletNumber,
      currency: wallet.currency,
      availableBalance: formatMoney(availableBalance),
      investedPrincipal: formatMoney(principal),
      pendingAmount: formatMoney(pending._sum.amount ?? 0),
      expectedRoi: formatMoney(expectedRoi._sum.roiDue ?? 0),
      realisedRoi: formatMoney(realisedRoi._sum.amount ?? 0),
      // Deliberately excludes expected/unrealised ROI (blueprint §5).
      totalPosition: formatMoney(availableBalance.plus(principal)),
    };
  }

  async getTransactions(investorId: string) {
    const wallet = await this.getWalletOrThrow(investorId);
    return this.prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'asc' },
    });
  }
}
