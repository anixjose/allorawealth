import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JournalService } from '../ledger/journal.service';
import { WalletService } from '../wallet/wallet.service';
import { AuditService } from '../audit/audit.service';
import { generateReferenceNumber } from '../common/reference-number';
import { toMoney } from '../common/money';
import { CreateInvestmentDto } from './dto/create-investment.dto';
import { generateRepaymentSchedule } from './repayment-schedule.generator';

@Injectable()
export class InvestmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly journalService: JournalService,
    private readonly walletService: WalletService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Blueprint §30: validate available balance, create the investment,
   * generate its repayment schedule, and post the journal — all inside
   * one DB transaction, so an investment is never created without the
   * matching wallet deduction (or vice versa).
   */
  async invest(dto: CreateInvestmentDto, actorId: string) {
    const amount = toMoney(dto.amount);
    if (amount.lessThanOrEqualTo(0)) {
      throw new BadRequestException('amount must be positive');
    }

    const opportunity = await this.prisma.investmentOpportunity.findUnique({
      where: { id: dto.opportunityId },
      include: { product: true },
    });
    if (!opportunity) {
      throw new NotFoundException(`Investment opportunity ${dto.opportunityId} not found`);
    }
    if (opportunity.status !== 'OPEN') {
      throw new BadRequestException(`Opportunity ${opportunity.name} is not open for investment`);
    }
    if (amount.lessThan(opportunity.minimumInvestment) || amount.lessThan(opportunity.product.minimumAmount)) {
      throw new BadRequestException('amount is below the minimum investment for this opportunity');
    }
    if (opportunity.product.maximumAmount && amount.greaterThan(opportunity.product.maximumAmount)) {
      throw new BadRequestException('amount exceeds the maximum allowed for this product');
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
      // Row lock serializes concurrent investors against the same opportunity —
      // without it, two simultaneous requests could both read a total that's
      // still under target and both proceed, jointly overfunding it. The
      // `status !== 'OPEN'` check above is just a cheap early-exit; this lock
      // + re-derived sum is what actually prevents the overfund race.
      await tx.$queryRaw`SELECT id FROM investment_opportunities WHERE id = ${dto.opportunityId} FOR UPDATE`;

      const committed = await tx.investment.aggregate({
        where: { opportunityId: dto.opportunityId },
        _sum: { principalAmount: true },
      });
      const committedTotal = toMoney(committed._sum.principalAmount ?? 0);
      const projectedTotal = committedTotal.plus(amount);
      if (projectedTotal.greaterThan(opportunity.targetAmount)) {
        throw new BadRequestException(
          `Investment of ${amount.toString()} would exceed the opportunity's target amount ` +
            `(committed ${committedTotal.toString()} of ${toMoney(opportunity.targetAmount).toString()})`,
        );
      }

      const availableBalance = await this.walletService.computeAvailableBalance(wallet.id, tx);
      if (availableBalance.lessThan(amount)) {
        throw new BadRequestException(
          `Insufficient available balance: has ${availableBalance.toString()}, needs ${amount.toString()}`,
        );
      }

      const investmentDate = new Date();
      const investment = await tx.investment.create({
        data: {
          investmentNumber: await generateReferenceNumber(tx, 'INVST'),
          investorId: dto.investorId,
          opportunityId: dto.opportunityId,
          principalAmount: amount,
          investmentDate,
          maturityDate: opportunity.maturityDate,
          expectedRoi: opportunity.expectedRoi,
          status: 'ACTIVE',
        },
      });

      const scheduleEntries = generateRepaymentSchedule({
        principal: amount,
        expectedRoiPercent: opportunity.expectedRoi,
        roiType: opportunity.product.roiType,
        tenureMonths: opportunity.product.tenureMonths,
        investmentDate,
      });

      await tx.repaymentSchedule.createMany({
        data: scheduleEntries.map((entry) => ({
          investmentId: investment.id,
          dueDate: entry.dueDate,
          principalDue: entry.principalDue,
          roiDue: entry.roiDue,
          totalDue: entry.totalDue,
          status: 'PENDING',
        })),
      });

      const journalEntry = await this.journalService.postJournal(
        {
          transactionDate: investmentDate,
          transactionType: 'INVESTMENT',
          referenceType: 'INVESTMENT',
          referenceId: investment.id,
          description: `Investment ${investment.investmentNumber} in ${opportunity.name}`,
          currency: opportunity.product.currency,
          createdById: actorId,
          lines: [
            { accountCode: '2010', debit: amount, investorId: dto.investorId, investmentId: investment.id }, // Dr Investor Wallet Liability
            { accountCode: '2020', credit: amount, investorId: dto.investorId, investmentId: investment.id }, // Cr Investor Investment Payable
          ],
        },
        tx,
      );

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          transactionNumber: await generateReferenceNumber(tx, 'TXN'),
          transactionType: 'INVESTMENT',
          direction: 'DEBIT',
          amount,
          currency: opportunity.product.currency,
          referenceType: 'INVESTMENT',
          referenceId: investment.id,
          journalEntryId: journalEntry.id,
          status: 'POSTED',
          postedAt: new Date(),
        },
      });

      // Reuses the OPEN-only gate above for free: once flipped, the very next
      // investment attempt against this opportunity fails at that pre-existing
      // check, with no separate enforcement path to keep in sync.
      if (projectedTotal.greaterThanOrEqualTo(opportunity.targetAmount)) {
        await tx.investmentOpportunity.update({
          where: { id: dto.opportunityId },
          data: { status: 'FULLY_FUNDED' },
        });
      }

      return tx.investment.findUniqueOrThrow({
        where: { id: investment.id },
        include: { repaymentSchedules: true },
      });
    });
  }

  async findById(id: string) {
    const investment = await this.prisma.investment.findUnique({
      where: { id },
      include: { repaymentSchedules: true, repayments: true, opportunity: true },
    });
    if (!investment) {
      throw new NotFoundException(`Investment ${id} not found`);
    }
    return investment;
  }

  /** Omit investorId for the admin "all investments" view; pass it to scope to one investor's portfolio. */
  async findAll(investorId?: string) {
    return this.prisma.investment.findMany({
      where: investorId ? { investorId } : undefined,
      include: { repaymentSchedules: true, opportunity: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Status-only default marking for the Defaulted Investments management
   * report. Deliberately does NOT post any journal/ledger entry — a real
   * default/write-off accounting treatment (which liability is impaired,
   * whether the investor absorbs the loss or the platform does) is a
   * separate design decision outside this slice's scope.
   */
  async markDefaulted(investmentId: string, reason: string, actorId: string) {
    const investment = await this.prisma.investment.findUnique({ where: { id: investmentId } });
    if (!investment) {
      throw new NotFoundException(`Investment ${investmentId} not found`);
    }
    if (investment.status !== 'ACTIVE') {
      throw new BadRequestException(`Investment ${investmentId} is not active (status: ${investment.status})`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.investment.update({
        where: { id: investmentId },
        data: { status: 'DEFAULTED', defaultedAt: new Date(), defaultReason: reason },
      });

      await this.auditService.record(
        {
          actorId,
          action: 'MARK_INVESTMENT_DEFAULTED',
          entityType: 'Investment',
          entityId: investmentId,
          before: { status: 'ACTIVE' },
          after: { status: 'DEFAULTED' },
          reason,
        },
        tx,
      );

      return updated;
    });
  }
}
