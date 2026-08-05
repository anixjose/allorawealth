import { IsNumberString, IsUUID } from 'class-validator';

export class CreateInvestmentDto {
  @IsUUID()
  investorId!: string;

  @IsUUID()
  opportunityId!: string;

  @IsNumberString()
  amount!: string;
}
