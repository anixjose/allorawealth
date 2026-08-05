import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { InvestmentsService } from './investments.service';
import { InvestorsService } from '../investors/investors.service';
import { CreateInvestmentDto } from './dto/create-investment.dto';
import { MarkDefaultedDto } from './dto/mark-defaulted.dto';

const STAFF_ROLES = ['ADMIN', 'SUPER_ADMIN', 'INVESTMENT_MANAGER', 'FINANCE_OFFICER'];

@Controller('investments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvestmentsController {
  constructor(
    private readonly investmentsService: InvestmentsService,
    private readonly investorsService: InvestorsService,
  ) {}

  @Post()
  @Roles('INVESTOR', 'ADMIN', 'SUPER_ADMIN', 'INVESTMENT_MANAGER')
  invest(@Body() dto: CreateInvestmentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.investmentsService.invest(dto, user.id);
  }

  /**
   * Investors only ever see their own portfolio — their investorId is
   * resolved from the JWT, ignoring any investorId they pass. Staff may
   * filter by investorId or omit it for the full admin investment list.
   */
  @Get()
  @Roles('INVESTOR', ...STAFF_ROLES)
  @RequirePermission('INVESTMENTS', 'VIEW')
  async findAll(@Query('investorId') investorId: string | undefined, @CurrentUser() user: AuthenticatedUser) {
    const isStaff = user.roles.some((role) => STAFF_ROLES.includes(role)) || user.permissions.includes('INVESTMENTS:VIEW');
    if (isStaff) {
      return this.investmentsService.findAll(investorId);
    }
    const investor = await this.investorsService.findByUserId(user.id);
    return this.investmentsService.findAll(investor.id);
  }

  @Get(':id')
  @Roles('INVESTOR', ...STAFF_ROLES)
  @RequirePermission('INVESTMENTS', 'VIEW')
  findOne(@Param('id') id: string) {
    return this.investmentsService.findById(id);
  }

  @Post(':id/default')
  @Roles('FINANCE_OFFICER', 'ADMIN', 'SUPER_ADMIN')
  markDefaulted(
    @Param('id') id: string,
    @Body() dto: MarkDefaultedDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.investmentsService.markDefaulted(id, dto.reason, user.id);
  }
}
