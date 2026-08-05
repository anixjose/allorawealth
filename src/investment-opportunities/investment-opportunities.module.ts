import { Module } from '@nestjs/common';
import { InvestmentOpportunitiesService } from './investment-opportunities.service';
import { InvestmentOpportunitiesController } from './investment-opportunities.controller';

@Module({
  providers: [InvestmentOpportunitiesService],
  controllers: [InvestmentOpportunitiesController],
  exports: [InvestmentOpportunitiesService],
})
export class InvestmentOpportunitiesModule {}
