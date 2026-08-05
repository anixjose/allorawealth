import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { RepaymentsService } from './repayments.service';
import { RecordRepaymentDto } from './dto/record-repayment.dto';
import { DisburseRepaymentsDto } from './dto/disburse-repayments.dto';
import { ListRepaymentsDto } from './dto/list-repayments.dto';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('FINANCE_OFFICER', 'ADMIN', 'SUPER_ADMIN')
export class RepaymentsController {
  constructor(private readonly repaymentsService: RepaymentsService) {}

  @Post('repayment-schedules/:scheduleId/accrue-roi')
  accrueRoi(@Param('scheduleId') scheduleId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.repaymentsService.accrueRoi(scheduleId, user.id);
  }

  @Post('repayments')
  recordRepayment(@Body() dto: RecordRepaymentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.repaymentsService.recordRepayment(dto, user.id);
  }

  @Get('repayments')
  @RequirePermission('REPAYMENTS', 'VIEW')
  findAll(@Query() query: ListRepaymentsDto) {
    return this.repaymentsService.findAll(query);
  }

  @Post('repayments/disburse')
  disburse(@Body() dto: DisburseRepaymentsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.repaymentsService.disburseRepayments(dto.repaymentIds, user.id);
  }
}
