import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { InvestorReportsService } from './investor-reports.service';
import { InvestorsService } from '../investors/investors.service';

const STAFF_ROLES = ['ADMIN', 'SUPER_ADMIN', 'FINANCE_OFFICER'];

/**
 * Investors only ever see their own statements — resolved from the JWT,
 * ignoring any investorId they pass, matching the self-scoping pattern
 * already used by wallet/investments/withdrawals endpoints. Staff may
 * request any investor's.
 */
@Controller('reports/investor')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('INVESTOR', ...STAFF_ROLES)
@RequirePermission('REPORTS', 'VIEW')
export class InvestorReportsController {
  constructor(
    private readonly investorReportsService: InvestorReportsService,
    private readonly investorsService: InvestorsService,
  ) {}

  @Get(':investorId/statement')
  async statement(@Param('investorId') investorId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.investorReportsService.investorStatement(await this.resolveInvestorId(investorId, user));
  }

  @Get(':investorId/roi-statement')
  async roiStatement(@Param('investorId') investorId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.investorReportsService.roiStatement(await this.resolveInvestorId(investorId, user));
  }

  @Get(':investorId/repayment-statement')
  async repaymentStatement(@Param('investorId') investorId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.investorReportsService.repaymentStatement(await this.resolveInvestorId(investorId, user));
  }

  private async resolveInvestorId(requestedInvestorId: string, user: AuthenticatedUser): Promise<string> {
    const isStaff = user.roles.some((role) => STAFF_ROLES.includes(role)) || user.permissions.includes('REPORTS:VIEW');
    if (isStaff) return requestedInvestorId;
    const investor = await this.investorsService.findByUserId(user.id);
    return investor.id;
  }
}
