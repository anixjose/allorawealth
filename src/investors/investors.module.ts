import { Module } from '@nestjs/common';
import { InvestorsService } from './investors.service';
import { InvestorsController } from './investors.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [InvestorsService],
  controllers: [InvestorsController],
  exports: [InvestorsService],
})
export class InvestorsModule {}
