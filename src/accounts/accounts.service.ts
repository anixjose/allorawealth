import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
}
