import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class DisburseRepaymentsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  repaymentIds!: string[];
}
