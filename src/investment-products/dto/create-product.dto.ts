import { IsIn, IsInt, IsNumberString, IsOptional, IsString, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  productCode!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumberString()
  minimumAmount!: string;

  @IsOptional()
  @IsNumberString()
  maximumAmount?: string;

  /** Percentage, e.g. "10.00" = 10% total return over the tenure. */
  @IsNumberString()
  expectedRoi!: string;

  @IsIn(['MONTHLY', 'QUARTERLY', 'BULLET'])
  roiType!: 'MONTHLY' | 'QUARTERLY' | 'BULLET';

  @IsInt()
  @Min(1)
  tenureMonths!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  riskLevel?: string;
}
