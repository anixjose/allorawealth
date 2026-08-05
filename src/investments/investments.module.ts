import { Module } from '@nestjs/common';
import { InvestmentsService } from './investments.service';
import { InvestmentsController } from './investments.controller';
import { LedgerModule } from '../ledger/ledger.module';
import { WalletModule } from '../wallet/wallet.module';
import { InvestorsModule } from '../investors/investors.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [LedgerModule, WalletModule, InvestorsModule, AuditModule],
  providers: [InvestmentsService],
  controllers: [InvestmentsController],
  exports: [InvestmentsService],
})
export class InvestmentsModule {}
