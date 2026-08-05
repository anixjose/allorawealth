import { Module } from '@nestjs/common';
import { JournalService } from './journal.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [JournalService],
  exports: [JournalService],
})
export class LedgerModule {}
