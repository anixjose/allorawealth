import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class InvestmentProductsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateProductDto) {
    return this.prisma.investmentProduct.create({
      data: {
        productCode: dto.productCode,
        name: dto.name,
        description: dto.description,
        minimumAmount: dto.minimumAmount,
        maximumAmount: dto.maximumAmount,
        expectedRoi: dto.expectedRoi,
        roiType: dto.roiType,
        tenureMonths: dto.tenureMonths,
        currency: dto.currency ?? 'INR',
        riskLevel: dto.riskLevel,
      },
    });
  }

  findAll() {
    return this.prisma.investmentProduct.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findById(id: string) {
    const product = await this.prisma.investmentProduct.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Investment product ${id} not found`);
    }
    return product;
  }
}
