import { ArrayNotEmpty, IsArray, IsEmail, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateStaffUserDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  roleIds?: string[];

  @IsOptional()
  @IsIn(['ACTIVE', 'SUSPENDED', 'DISABLED'])
  status?: 'ACTIVE' | 'SUSPENDED' | 'DISABLED';
}
