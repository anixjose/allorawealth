import { IsDateString, IsNumberString, IsOptional, IsUUID } from 'class-validator';

export class RecordRepaymentDto {
  @IsUUID()
  investmentId!: string;

  @IsOptional()
  @IsUUID()
  scheduleId?: string;

  @IsOptional()
  @IsNumberString()
  principalAmount?: string;

  @IsOptional()
  @IsNumberString()
  roiAmount?: string;

  @IsOptional()
  @IsNumberString()
  otherAmount?: string;

  @IsOptional()
  @IsDateString()
  paymentDate?: string;
}
