import { ArrayNotEmpty, IsArray, IsEmail, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateStaffUserDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  roleIds!: string[];
}
