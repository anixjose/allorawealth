import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';

@Injectable()
export class InvestmentCompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateCompanyDto) {
    return this.prisma.investmentCompany.create({ data: dto });
  }

  findAll() {
    return this.prisma.investmentCompany.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findById(id: string) {
    const company = await this.prisma.investmentCompany.findUnique({ where: { id } });
    if (!company) {
      throw new NotFoundException(`Investment company ${id} not found`);
    }
    return company;
  }
}
