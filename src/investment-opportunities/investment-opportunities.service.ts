import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';

@Injectable()
export class InvestmentOpportunitiesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateOpportunityDto) {
    return this.prisma.investmentOpportunity.create({
      data: {
        productId: dto.productId,
        companyId: dto.companyId,
        name: dto.name,
        description: dto.description,
        targetAmount: dto.targetAmount,
        minimumInvestment: dto.minimumInvestment,
        expectedRoi: dto.expectedRoi,
        startDate: new Date(dto.startDate),
        maturityDate: new Date(dto.maturityDate),
        status: 'OPEN',
      },
    });
  }

  findAll() {
    return this.prisma.investmentOpportunity.findMany({
      include: { product: true, company: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const opportunity = await this.prisma.investmentOpportunity.findUnique({
      where: { id },
      include: { product: true, company: true },
    });
    if (!opportunity) {
      throw new NotFoundException(`Investment opportunity ${id} not found`);
    }
    return opportunity;
  }
}
