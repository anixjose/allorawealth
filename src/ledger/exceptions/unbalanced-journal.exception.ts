import { BadRequestException } from '@nestjs/common';

/**
 * Blueprint §14: "The API should reject a journal if [debit != credit]".
 * Thrown before any DB write — an unbalanced journal must never be
 * persisted, not even partially.
 */
export class UnbalancedJournalException extends BadRequestException {
  constructor(totalDebit: string, totalCredit: string, currency: string) {
    super(
      `Journal is not balanced for ${currency}: total debit ${totalDebit} != total credit ${totalCredit}`,
    );
  }
}
