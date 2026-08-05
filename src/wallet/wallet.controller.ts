import { Controller, ForbiddenException, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { WalletService } from './wallet.service';
import { InvestorsService } from '../investors/investors.service';

const STAFF_ROLES = ['ADMIN', 'SUPER_ADMIN', 'FINANCE_OFFICER', 'COMPLIANCE_OFFICER', 'INVESTMENT_MANAGER', 'APPROVER'];

@Controller('wallets')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('INVESTOR', ...STAFF_ROLES)
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly investorsService: InvestorsService,
  ) {}

  @Get(':investorId/position')
  async getPosition(@Param('investorId') investorId: string, @CurrentUser() user: AuthenticatedUser) {
    await this.assertCanAccess(investorId, user);
    return this.walletService.getPosition(investorId);
  }

  @Get(':investorId/transactions')
  async getTransactions(@Param('investorId') investorId: string, @CurrentUser() user: AuthenticatedUser) {
    await this.assertCanAccess(investorId, user);
    return this.walletService.getTransactions(investorId);
  }

  /** An INVESTOR may only ever view their own wallet; staff roles may view any investor's. */
  private async assertCanAccess(investorId: string, user: AuthenticatedUser) {
    if (user.roles.some((role) => STAFF_ROLES.includes(role))) {
      return;
    }
    const investor = await this.investorsService.findByUserId(user.id);
    if (investor.id !== investorId) {
      throw new ForbiddenException("Cannot access another investor's wallet");
    }
  }
}
