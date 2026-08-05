import { IsArray, IsString } from 'class-validator';

export class UpdateRolePermissionsDto {
  /** Replaces the category's full permission set, e.g. ["DEPOSITS:VIEW", "REPORTS:VIEW"] */
  @IsArray()
  @IsString({ each: true })
  permissions!: string[];
}
