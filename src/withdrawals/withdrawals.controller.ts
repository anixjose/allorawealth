import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { WithdrawalsService } from './withdrawals.service';
import { InvestorsService } from '../investors/investors.service';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { RejectWithdrawalDto } from './dto/reject-withdrawal.dto';
import { ListWithdrawalsDto } from './dto/list-withdrawals.dto';

const STAFF_ROLES = ['FINANCE_OFFICER', 'APPROVER', 'ADMIN', 'SUPER_ADMIN'];

@Controller('withdrawals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WithdrawalsController {
  constructor(
    private readonly withdrawalsService: WithdrawalsService,
    private readonly investorsService: InvestorsService,
  ) {}

  @Post()
  @Roles('INVESTOR', 'ADMIN')
  request(@Body() dto: CreateWithdrawalDto, @CurrentUser() user: AuthenticatedUser) {
    return this.withdrawalsService.request(dto, user.id);
  }

  @Post(':id/approve')
  @Roles('APPROVER', 'ADMIN', 'SUPER_ADMIN')
  approve(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.withdrawalsService.approve(id, user.id);
  }

  @Post(':id/complete')
  @Roles('FINANCE_OFFICER', 'ADMIN', 'SUPER_ADMIN')
  complete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.withdrawalsService.complete(id, user.id);
  }

  @Post(':id/reject')
  @Roles('APPROVER', 'FINANCE_OFFICER', 'ADMIN', 'SUPER_ADMIN')
  reject(
    @Param('id') id: string,
    @Body() dto: RejectWithdrawalDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.withdrawalsService.reject(id, dto.reason, user.id);
  }

  /**
   * Investors only ever see their own requests — their own investorId is
   * resolved from the JWT and any investorId they pass is ignored, so an
   * INVESTOR-role caller can never browse another investor's withdrawal
   * history. Staff roles (finance/approver/admin) may filter freely by
   * status and/or investorId, or omit both for the full queue.
   */
  @Get()
  @Roles('INVESTOR', ...STAFF_ROLES)
  @RequirePermission('WITHDRAWALS', 'VIEW')
  async findAll(@Query() query: ListWithdrawalsDto, @CurrentUser() user: AuthenticatedUser) {
    // A custom category granted WITHDRAWALS:VIEW sees the full queue, same as a fixed staff role —
    // the whole point of that grant is to view everyone's requests, not a nonexistent own-investor scope.
    const isStaff =
      user.roles.some((role) => STAFF_ROLES.includes(role)) || user.permissions.includes('WITHDRAWALS:VIEW');
    if (isStaff) {
      return this.withdrawalsService.findAll({ investorId: query.investorId, status: query.status });
    }

    const investor = await this.investorsService.findByUserId(user.id);
    return this.withdrawalsService.findAll({ investorId: investor.id, status: query.status });
  }

  @Get(':id')
  @Roles('INVESTOR', 'FINANCE_OFFICER', 'APPROVER', 'ADMIN', 'SUPER_ADMIN')
  @RequirePermission('WITHDRAWALS', 'VIEW')
  findOne(@Param('id') id: string) {
    return this.withdrawalsService.findById(id);
  }
}
