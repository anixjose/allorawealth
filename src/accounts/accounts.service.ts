import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AccountType, Prisma, ScheduleIIIGroup } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SCHEDULE_III_GROUPS_BY_ACCOUNT_TYPE, SCHEDULE_III_GROUP_LABELS } from '../reports/schedule-iii';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.account.findMany({ orderBy: { accountCode: 'asc' } });
  }

  async findByCode(accountCode: string) {
    const account = await this.prisma.account.findUnique({ where: { accountCode } });
    if (!account) {
      throw new NotFoundException(`Account ${accountCode} not found`);
    }
    return account;
  }

  /** parentAccountId absent -> a new top-level GL account; present -> a new Sub Ledger under that GL account. */
  async create(dto: CreateAccountDto) {
    let parent = null;
    if (dto.parentAccountId) {
      parent = await this.prisma.account.findUnique({ where: { id: dto.parentAccountId } });
      if (!parent) {
        throw new NotFoundException(`Parent GL account ${dto.parentAccountId} not found`);
      }
      if (parent.accountType !== dto.accountType) {
        throw new BadRequestException(
          `Sub Ledger type (${dto.accountType}) must match its parent GL account's type (${parent.accountType})`,
        );
      }
    }

    this.assertValidGroup(dto.accountType, dto.scheduleIiiGroup);

    try {
      return await this.prisma.account.create({
        data: {
          accountCode: dto.accountCode,
          accountName: dto.accountName,
          accountType: dto.accountType,
          parentAccountId: dto.parentAccountId ?? null,
          currency: dto.currency ?? 'INR',
          scheduleIiiGroup: dto.scheduleIiiGroup,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException(`Account code ${dto.accountCode} already exists`);
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateAccountDto) {
    const existing = await this.prisma.account.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Account ${id} not found`);
    }
    if (dto.scheduleIiiGroup) {
      this.assertValidGroup(existing.accountType, dto.scheduleIiiGroup);
    }
    if (dto.status === 'INACTIVE' && existing.status !== 'INACTIVE') {
      const transactionCount = await this.prisma.journalLine.count({ where: { accountId: id } });
      if (transactionCount > 0) {
        throw new ConflictException(
          `"${existing.accountName}" has ${transactionCount} posted transaction(s) and cannot be deactivated — only accounts with no transactions can be deactivated.`,
        );
      }
    }
    return this.prisma.account.update({
      where: { id },
      data: { accountName: dto.accountName, status: dto.status, scheduleIiiGroup: dto.scheduleIiiGroup },
    });
  }

  private assertValidGroup(accountType: AccountType, group: ScheduleIIIGroup) {
    const allowed = SCHEDULE_III_GROUPS_BY_ACCOUNT_TYPE[accountType];
    if (!allowed.includes(group)) {
      throw new BadRequestException(
        `"${SCHEDULE_III_GROUP_LABELS[group]}" is not a valid Schedule III group for a ${accountType} account`,
      );
    }
  }
}
