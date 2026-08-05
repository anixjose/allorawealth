import { BadRequestException } from '@nestjs/common';

export class InvalidJournalLineException extends BadRequestException {
  constructor(reason: string) {
    super(`Invalid journal line: ${reason}`);
  }
}
