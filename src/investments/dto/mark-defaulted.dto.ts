import { IsString, MinLength } from 'class-validator';

export class MarkDefaultedDto {
  @IsString()
  @MinLength(3)
  reason!: string;
}
