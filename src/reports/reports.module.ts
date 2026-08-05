import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { FinancialReportsService } from './financial-reports.service';
import { FinancialReportsController } from './financial-reports.controller';
import { InvestorReportsService } from './investor-reports.service';
import { InvestorReportsController } from './investor-reports.controller';
import { InvestorsModule } from '../investors/investors.module';

@Module({
  imports: [InvestorsModule],
  providers: [ReportsService, FinancialReportsService, InvestorReportsService],
  controllers: [ReportsController, FinancialReportsController, InvestorReportsController],
})
export class ReportsModule {}
