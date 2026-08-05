import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { InvestmentProductsService } from './investment-products.service';
import { CreateProductDto } from './dto/create-product.dto';

@Controller('investment-products')
@UseGuards(JwtAuthGuard)
export class InvestmentProductsController {
  constructor(private readonly productsService: InvestmentProductsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('INVESTMENT_MANAGER', 'ADMIN', 'SUPER_ADMIN')
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findById(id);
  }
}
