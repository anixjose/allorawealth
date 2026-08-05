import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { ReconciliationService } from './reconciliation.service';

@Controller('reconciliation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('FINANCE_OFFICER', 'ADMIN', 'SUPER_ADMIN')
export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  @Post('run')
  run(@CurrentUser() user: AuthenticatedUser) {
    return this.reconciliationService.run(user.id);
  }

  @Get()
  @RequirePermission('RECONCILIATION', 'VIEW')
  findAll() {
    return this.reconciliationService.findAll();
  }

  @Get(':id/items')
  @RequirePermission('RECONCILIATION', 'VIEW')
  findItems(@Param('id') id: string) {
    return this.reconciliationService.findItems(id);
  }
}
