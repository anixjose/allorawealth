import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './audit/audit.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { LedgerModule } from './ledger/ledger.module';
import { AccountsModule } from './accounts/accounts.module';
import { InvestorsModule } from './investors/investors.module';
import { WalletModule } from './wallet/wallet.module';
import { DepositsModule } from './deposits/deposits.module';
import { InvestmentCompaniesModule } from './investment-companies/investment-companies.module';
import { InvestmentProductsModule } from './investment-products/investment-products.module';
import { InvestmentOpportunitiesModule } from './investment-opportunities/investment-opportunities.module';
import { InvestmentsModule } from './investments/investments.module';
import { RepaymentsModule } from './repayments/repayments.module';
import { WithdrawalsModule } from './withdrawals/withdrawals.module';
import { ReconciliationModule } from './reconciliation/reconciliation.module';
import { ReportsModule } from './reports/reports.module';
import { RolesModule } from './roles/roles.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuditModule,
    UsersModule,
    AuthModule,
    LedgerModule,
    AccountsModule,
    InvestorsModule,
    WalletModule,
    DepositsModule,
    InvestmentCompaniesModule,
    InvestmentProductsModule,
    InvestmentOpportunitiesModule,
    InvestmentsModule,
    RepaymentsModule,
    WithdrawalsModule,
    ReconciliationModule,
    ReportsModule,
    RolesModule,
  ],
})
export class AppModule {}
