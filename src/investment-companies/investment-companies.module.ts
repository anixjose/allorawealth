import { Module } from '@nestjs/common';
import { InvestmentCompaniesService } from './investment-companies.service';
import { InvestmentCompaniesController } from './investment-companies.controller';

@Module({
  providers: [InvestmentCompaniesService],
  controllers: [InvestmentCompaniesController],
  exports: [InvestmentCompaniesService],
})
export class InvestmentCompaniesModule {}
