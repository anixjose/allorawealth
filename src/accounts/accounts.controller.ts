import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AccountsService } from './accounts.service';

@Controller('accounts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('FINANCE_OFFICER', 'ADMIN', 'SUPER_ADMIN')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  findAll() {
    return this.accountsService.findAll();
  }

  @Get(':accountCode')
  findOne(@Param('accountCode') accountCode: string) {
    return this.accountsService.findByCode(accountCode);
  }
}
