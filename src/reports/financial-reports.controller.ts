import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { FinancialReportsService } from './financial-reports.service';

@Controller('reports/financial')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('FINANCE_OFFICER', 'ADMIN', 'SUPER_ADMIN')
@RequirePermission('REPORTS', 'VIEW')
export class FinancialReportsController {
  constructor(private readonly financialReportsService: FinancialReportsService) {}

  @Get('trial-balance')
  trialBalance() {
    return this.financialReportsService.trialBalance();
  }

  @Get('general-ledger/:accountCode')
  generalLedger(@Param('accountCode') accountCode: string) {
    return this.financialReportsService.generalLedger(accountCode);
  }

  @Get('profit-and-loss')
  profitAndLoss() {
    return this.financialReportsService.profitAndLoss();
  }

  @Get('balance-sheet')
  balanceSheet() {
    return this.financialReportsService.balanceSheet();
  }

  @Get('cash-flow')
  cashFlowStatement() {
    return this.financialReportsService.cashFlowStatement();
  }

  @Get('cash-book')
  cashBook() {
    return this.financialReportsService.cashBook();
  }

  @Get('investor-liabilities')
  investorLiabilities() {
    return this.financialReportsService.investorLiabilities();
  }

  @Get('investor-roi')
  investorRoi() {
    return this.financialReportsService.investorRoi();
  }

  @Get('investment-receivables')
  investmentReceivables() {
    return this.financialReportsService.investmentReceivables();
  }
}
