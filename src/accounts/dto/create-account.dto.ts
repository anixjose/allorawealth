import { IsEnum, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { AccountType, ScheduleIIIGroup } from '@prisma/client';

export class CreateAccountDto {
  @IsString()
  @Matches(/^\d{3,6}$/, { message: 'accountCode must be numeric, 3-6 digits (e.g. 1050)' })
  accountCode!: string;

  @IsString()
  @MaxLength(120)
  accountName!: string;

  @IsEnum(AccountType)
  accountType!: AccountType;

  /** Which Schedule III (Division I) sub-head this account reports under — must be valid for accountType. */
  @IsEnum(ScheduleIIIGroup)
  scheduleIiiGroup!: ScheduleIIIGroup;

  /** Omit to create a top-level GL account; set to create a Sub Ledger under that GL account. */
  @IsOptional()
  @IsString()
  parentAccountId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;
}
