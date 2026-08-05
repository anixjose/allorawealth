import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { RepaymentStatus } from '@prisma/client';

const STATUSES: RepaymentStatus[] = ['POSTED', 'RECEIVED', 'DISBURSED', 'REVERSED'];

export class ListRepaymentsDto {
  @IsOptional()
  @IsUUID()
  investmentId?: string;

  @IsOptional()
  @IsIn(STATUSES)
  status?: RepaymentStatus;
}
