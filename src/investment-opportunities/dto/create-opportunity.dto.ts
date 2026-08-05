import { IsDateString, IsNumberString, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateOpportunityDto {
  @IsUUID()
  productId!: string;

  @IsUUID()
  companyId!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumberString()
  targetAmount!: string;

  @IsNumberString()
  minimumInvestment!: string;

  @IsNumberString()
  expectedRoi!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  maturityDate!: string;
}
