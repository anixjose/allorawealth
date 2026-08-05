import { IsNumberString, IsString, IsUUID } from 'class-validator';

export class CreateWithdrawalDto {
  @IsUUID()
  investorId!: string;

  @IsNumberString()
  amount!: string;

  @IsString()
  currency!: string;
}
