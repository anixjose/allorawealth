import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { InvestorsService } from './investors.service';
import { RegisterInvestorDto } from './dto/register-investor.dto';
import { RegisterBusinessDto } from './dto/register-business.dto';

@Controller('investors')
export class InvestorsController {
  constructor(private readonly investorsService: InvestorsService) {}

  @Post('register')
  register(@Body() dto: RegisterInvestorDto) {
    return this.investorsService.register(dto);
  }

  @Post('register-business')
  registerBusiness(@Body() dto: RegisterBusinessDto) {
    return this.investorsService.registerBusiness(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  findMe(@CurrentUser() user: AuthenticatedUser) {
    return this.investorsService.findByUserId(user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'FINANCE_OFFICER', 'COMPLIANCE_OFFICER', 'INVESTMENT_MANAGER')
  @RequirePermission('INVESTORS', 'VIEW')
  findAll() {
    return this.investorsService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.investorsService.findById(id);
  }

  @Post(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'COMPLIANCE_OFFICER')
  approve(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.investorsService.approve(id, user.id);
  }
}
