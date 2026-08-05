import { Module } from '@nestjs/common';
import { InvestmentProductsService } from './investment-products.service';
import { InvestmentProductsController } from './investment-products.controller';

@Module({
  providers: [InvestmentProductsService],
  controllers: [InvestmentProductsController],
  exports: [InvestmentProductsService],
})
export class InvestmentProductsModule {}
