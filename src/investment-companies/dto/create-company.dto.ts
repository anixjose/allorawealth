import { IsOptional, IsString } from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  companyCode!: string;

  @IsString()
  legalName!: string;

  @IsString()
  registrationNumber!: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  contactDetails?: string;
}
