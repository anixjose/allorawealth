import { IsNumberString, IsString, IsUUID } from 'class-validator';

export class RequestDepositDto {
  @IsUUID()
  investorId!: string;

  /** String, not number — money is never parsed through JS floats. */
  @IsNumberString({ no_symbols: false })
  amount!: string;

  @IsString()
  currency!: string;

  /**
   * Bank/payment-gateway reference. Idempotency key: replaying the same
   * reference (e.g. a duplicated bank webhook) returns the original
   * deposit request instead of creating a second one.
   */
  @IsString()
  paymentReference!: string;
}
