import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { DepositsService } from './deposits.service';
import { InvestorsService } from '../investors/investors.service';
import { RequestDepositDto } from './dto/request-deposit.dto';
import { RejectDepositDto } from './dto/reject-deposit.dto';
import { ListDepositsDto } from './dto/list-deposits.dto';

const STAFF_ROLES = ['FINANCE_OFFICER', 'ADMIN', 'SUPER_ADMIN'];

@Controller('deposits')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DepositsController {
  constructor(
    private readonly depositsService: DepositsService,
    private readonly investorsService: InvestorsService,
  ) {}

  @Post()
  @Roles('INVESTOR', 'ADMIN')
  request(@Body() dto: RequestDepositDto, @CurrentUser() user: AuthenticatedUser) {
    return this.depositsService.request(dto, user.id);
  }

  @Post(':id/approve')
  @Roles('FINANCE_OFFICER', 'ADMIN', 'SUPER_ADMIN')
  approve(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.depositsService.approve(id, user.id);
  }

  @Post(':id/reject')
  @Roles('FINANCE_OFFICER', 'ADMIN', 'SUPER_ADMIN')
  reject(@Param('id') id: string, @Body() dto: RejectDepositDto, @CurrentUser() user: AuthenticatedUser) {
    return this.depositsService.reject(id, dto.reason, user.id);
  }

  /**
   * Investors only ever see their own requests — their own investorId is
   * resolved from the JWT and any investorId they pass is ignored, so an
   * INVESTOR-role caller can never browse another investor's deposit
   * history. Staff roles may filter freely by status and/or investorId,
   * or omit both for the full queue.
   */
  @Get()
  @Roles('INVESTOR', ...STAFF_ROLES)
  @RequirePermission('DEPOSITS', 'VIEW')
  async findAll(@Query() query: ListDepositsDto, @CurrentUser() user: AuthenticatedUser) {
    // A custom category granted DEPOSITS:VIEW sees the full queue, same as a fixed staff role —
    // the whole point of that grant is to view everyone's requests, not a nonexistent own-investor scope.
    const isStaff = user.roles.some((role) => STAFF_ROLES.includes(role)) || user.permissions.includes('DEPOSITS:VIEW');
    if (isStaff) {
      return this.depositsService.findAll({ investorId: query.investorId, status: query.status });
    }

    const investor = await this.investorsService.findByUserId(user.id);
    return this.depositsService.findAll({ investorId: investor.id, status: query.status });
  }

  @Get(':id')
  @Roles('INVESTOR', ...STAFF_ROLES)
  @RequirePermission('DEPOSITS', 'VIEW')
  findOne(@Param('id') id: string) {
    return this.depositsService.findById(id);
  }
}
