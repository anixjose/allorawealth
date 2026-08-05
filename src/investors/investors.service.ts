import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { generateReferenceNumber } from '../common/reference-number';
import { RegisterInvestorDto } from './dto/register-investor.dto';
import { RegisterBusinessDto } from './dto/register-business.dto';

@Injectable()
export class InvestorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Blueprint §3 defines a full Registration -> Email/Mobile Verification ->
   * KYC -> AML Screening -> Compliance Approval -> Activated -> Wallet
   * Activated pipeline. The KYC/AML vendor integration itself is still out
   * of scope for this slice (kycStatus/amlStatus stay stubbed VERIFIED/
   * CLEARED), but the Compliance Approval gate is real: the investor is
   * created PENDING_ACTIVATION and can't transact (see the status check in
   * DepositsService/WithdrawalsService/InvestmentsService) until an admin
   * calls `approve()`. The investor can still log in and browse immediately
   * — only transacting is gated.
   */
  async register(dto: RegisterInvestorDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const investorRole = await tx.role.findUniqueOrThrow({ where: { name: 'INVESTOR' } });

        const user = await tx.user.create({
          data: {
            firstName: dto.firstName,
            lastName: dto.lastName,
            email: dto.email,
            passwordHash,
            status: 'ACTIVE',
            userRoles: { create: { roleId: investorRole.id } },
          },
        });

        const investor = await tx.investor.create({
          data: {
            userId: user.id,
            investorNumber: await generateReferenceNumber(tx, 'INV'),
            entityType: 'INDIVIDUAL',
            nationality: dto.nationality,
            country: dto.country,
            kycStatus: 'VERIFIED',
            amlStatus: 'CLEARED',
            status: 'PENDING_ACTIVATION',
          },
        });

        const wallet = await tx.wallet.create({
          data: {
            investorId: investor.id,
            walletNumber: await generateReferenceNumber(tx, 'WAL'),
            currency: dto.currency ?? 'INR',
            status: 'ACTIVE',
          },
        });

        return { investor, wallet, user: { id: user.id, email: user.email } };
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('An account with this email already exists.');
      }
      throw err;
    }
  }

  /** Same underlying Investor/Wallet shape as register() — see the entityType discriminator on Investor for why this isn't a separate model. */
  async registerBusiness(dto: RegisterBusinessDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const investorRole = await tx.role.findUniqueOrThrow({ where: { name: 'INVESTOR' } });

        const user = await tx.user.create({
          data: {
            firstName: dto.businessName,
            lastName: '',
            email: dto.email,
            passwordHash,
            status: 'ACTIVE',
            userRoles: { create: { roleId: investorRole.id } },
          },
        });

        const investor = await tx.investor.create({
          data: {
            userId: user.id,
            investorNumber: await generateReferenceNumber(tx, 'BUS'),
            entityType: 'BUSINESS',
            businessName: dto.businessName,
            registrationNumber: dto.registrationNumber,
            country: dto.country,
            kycStatus: 'VERIFIED',
            amlStatus: 'CLEARED',
            status: 'PENDING_ACTIVATION',
          },
        });

        const wallet = await tx.wallet.create({
          data: {
            investorId: investor.id,
            walletNumber: await generateReferenceNumber(tx, 'WAL'),
            currency: dto.currency ?? 'INR',
            status: 'ACTIVE',
          },
        });

        return { investor, wallet, user: { id: user.id, email: user.email } };
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('An account with this email or registration number already exists.');
      }
      throw err;
    }
  }

  async approve(investorId: string, approverId: string) {
    const investor = await this.prisma.investor.findUnique({ where: { id: investorId } });
    if (!investor) {
      throw new NotFoundException(`Investor ${investorId} not found`);
    }
    if (investor.status !== 'PENDING_ACTIVATION') {
      throw new BadRequestException(`Investor ${investorId} is not awaiting activation`);
    }

    const updated = await this.prisma.investor.update({
      where: { id: investorId },
      data: { status: 'ACTIVE', approvedAt: new Date(), approvedById: approverId },
    });

    await this.auditService.record({
      actorId: approverId,
      action: 'APPROVE_INVESTOR',
      entityType: 'Investor',
      entityId: investorId,
      before: { status: investor.status },
      after: { status: 'ACTIVE' },
    });

    return updated;
  }

  async findById(investorId: string) {
    const investor = await this.prisma.investor.findUnique({
      where: { id: investorId },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } }, wallet: true },
    });
    if (!investor) {
      throw new NotFoundException(`Investor ${investorId} not found`);
    }
    return investor;
  }

  /** Resolves the investor record for the currently authenticated user (JWT carries a userId, not an investorId). */
  async findByUserId(userId: string) {
    const investor = await this.prisma.investor.findUnique({
      where: { userId },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } }, wallet: true },
    });
    if (!investor) {
      throw new NotFoundException(`No investor profile for user ${userId}`);
    }
    return investor;
  }

  async findAll() {
    return this.prisma.investor.findMany({
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } }, wallet: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
