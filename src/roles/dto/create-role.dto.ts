import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  /** e.g. ["DEPOSITS:VIEW", "REPORTS:VIEW"] */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}
