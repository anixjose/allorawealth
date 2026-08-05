import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { WithdrawalStatus } from '@prisma/client';

const STATUSES: WithdrawalStatus[] = [
  'PENDING',
  'UNDER_REVIEW',
  'APPROVED',
  'PROCESSING',
  'COMPLETED',
  'REJECTED',
  'FAILED',
  'CANCELLED',
];

export class ListWithdrawalsDto {
  @IsOptional()
  @IsUUID()
  investorId?: string;

  @IsOptional()
  @IsIn(STATUSES)
  status?: WithdrawalStatus;
}
