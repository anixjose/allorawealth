import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { DepositStatus } from '@prisma/client';

const STATUSES: DepositStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];

export class ListDepositsDto {
  @IsOptional()
  @IsUUID()
  investorId?: string;

  @IsOptional()
  @IsIn(STATUSES)
  status?: DepositStatus;
}
