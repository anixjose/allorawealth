import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { AccountStatus, ScheduleIIIGroup } from '@prisma/client';

export class UpdateAccountDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  accountName?: string;

  @IsOptional()
  @IsEnum(AccountStatus)
  status?: AccountStatus;

  /** Reclassify which Schedule III sub-head this account reports under — must stay valid for its accountType. */
  @IsOptional()
  @IsEnum(ScheduleIIIGroup)
  scheduleIiiGroup?: ScheduleIIIGroup;
}
