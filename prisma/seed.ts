import { PrismaClient, AccountType, ScheduleIIIGroup } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Chart of accounts — blueprint §12, exact codes. scheduleIiiGroup classifies each account
// per Schedule III (Division I), Companies Act 2013, matching the backfill in migration
// 20260806120000_schedule_iii_classification.
const CHART_OF_ACCOUNTS: Array<{
  code: string;
  name: string;
  type: AccountType;
  parentCode?: string;
  scheduleIiiGroup: ScheduleIIIGroup;
}> = [
  { code: '1000', name: 'ASSETS', type: 'ASSET', scheduleIiiGroup: 'OTHER_CURRENT_ASSETS' },
  { code: '1010', name: 'Bank Account', type: 'ASSET', parentCode: '1000', scheduleIiiGroup: 'CASH_AND_CASH_EQUIVALENTS' },
  { code: '1020', name: 'Payment Gateway Receivable', type: 'ASSET', parentCode: '1000', scheduleIiiGroup: 'OTHER_CURRENT_ASSETS' },
  { code: '1030', name: 'Investment Receivable', type: 'ASSET', parentCode: '1000', scheduleIiiGroup: 'OTHER_CURRENT_ASSETS' },
  { code: '1040', name: 'Other Receivables', type: 'ASSET', parentCode: '1000', scheduleIiiGroup: 'OTHER_CURRENT_ASSETS' },
  // Non-current assets — Schedule III (Division I) full coverage.
  { code: '1050', name: 'Fixed Assets', type: 'ASSET', parentCode: '1000', scheduleIiiGroup: 'OTHER_NON_CURRENT_ASSETS' },
  { code: '1051', name: 'Tangible Assets', type: 'ASSET', parentCode: '1050', scheduleIiiGroup: 'TANGIBLE_ASSETS' },
  { code: '1052', name: 'Intangible Assets', type: 'ASSET', parentCode: '1050', scheduleIiiGroup: 'INTANGIBLE_ASSETS' },
  { code: '1053', name: 'Capital Work-in-Progress', type: 'ASSET', parentCode: '1050', scheduleIiiGroup: 'CAPITAL_WORK_IN_PROGRESS' },
  {
    code: '1054',
    name: 'Intangible Assets under Development',
    type: 'ASSET',
    parentCode: '1050',
    scheduleIiiGroup: 'INTANGIBLE_ASSETS_UNDER_DEVELOPMENT',
  },
  { code: '1060', name: 'Non-current Investments', type: 'ASSET', parentCode: '1000', scheduleIiiGroup: 'NON_CURRENT_INVESTMENTS' },
  { code: '1070', name: 'Deferred Tax Assets (Net)', type: 'ASSET', parentCode: '1000', scheduleIiiGroup: 'DEFERRED_TAX_ASSETS' },
  {
    code: '1080',
    name: 'Long-term Loans and Advances',
    type: 'ASSET',
    parentCode: '1000',
    scheduleIiiGroup: 'LONG_TERM_LOANS_AND_ADVANCES',
  },
  { code: '1090', name: 'Other Non-current Assets', type: 'ASSET', parentCode: '1000', scheduleIiiGroup: 'OTHER_NON_CURRENT_ASSETS' },
  // Current assets.
  { code: '1100', name: 'Current Investments', type: 'ASSET', parentCode: '1000', scheduleIiiGroup: 'CURRENT_INVESTMENTS' },
  { code: '1110', name: 'Inventories', type: 'ASSET', parentCode: '1000', scheduleIiiGroup: 'INVENTORIES' },
  { code: '1120', name: 'Trade Receivables', type: 'ASSET', parentCode: '1000', scheduleIiiGroup: 'TRADE_RECEIVABLES' },
  {
    code: '1130',
    name: 'Short-term Loans and Advances',
    type: 'ASSET',
    parentCode: '1000',
    scheduleIiiGroup: 'SHORT_TERM_LOANS_AND_ADVANCES',
  },

  { code: '2000', name: 'LIABILITIES', type: 'LIABILITY', scheduleIiiGroup: 'OTHER_CURRENT_LIABILITIES' },
  { code: '2010', name: 'Investor Wallet Liability', type: 'LIABILITY', parentCode: '2000', scheduleIiiGroup: 'OTHER_CURRENT_LIABILITIES' },
  { code: '2020', name: 'Investor Investment Payable', type: 'LIABILITY', parentCode: '2000', scheduleIiiGroup: 'OTHER_CURRENT_LIABILITIES' },
  { code: '2030', name: 'Investor ROI Payable', type: 'LIABILITY', parentCode: '2000', scheduleIiiGroup: 'OTHER_CURRENT_LIABILITIES' },
  { code: '2040', name: 'Investor Withdrawal Payable', type: 'LIABILITY', parentCode: '2000', scheduleIiiGroup: 'OTHER_CURRENT_LIABILITIES' },
  // Non-current liabilities — Schedule III (Division I) full coverage.
  { code: '2050', name: 'Long-term Borrowings', type: 'LIABILITY', parentCode: '2000', scheduleIiiGroup: 'LONG_TERM_BORROWINGS' },
  {
    code: '2060',
    name: 'Deferred Tax Liabilities (Net)',
    type: 'LIABILITY',
    parentCode: '2000',
    scheduleIiiGroup: 'DEFERRED_TAX_LIABILITIES',
  },
  {
    code: '2070',
    name: 'Other Long-term Liabilities',
    type: 'LIABILITY',
    parentCode: '2000',
    scheduleIiiGroup: 'OTHER_LONG_TERM_LIABILITIES',
  },
  { code: '2080', name: 'Long-term Provisions', type: 'LIABILITY', parentCode: '2000', scheduleIiiGroup: 'LONG_TERM_PROVISIONS' },
  // Current liabilities.
  { code: '2090', name: 'Short-term Borrowings', type: 'LIABILITY', parentCode: '2000', scheduleIiiGroup: 'SHORT_TERM_BORROWINGS' },
  { code: '2100', name: 'Trade Payables', type: 'LIABILITY', parentCode: '2000', scheduleIiiGroup: 'TRADE_PAYABLES' },
  { code: '2110', name: 'Short-term Provisions', type: 'LIABILITY', parentCode: '2000', scheduleIiiGroup: 'SHORT_TERM_PROVISIONS' },

  { code: '3000', name: 'EQUITY', type: 'EQUITY', scheduleIiiGroup: 'RESERVES_AND_SURPLUS' },
  { code: '3010', name: 'Share Capital', type: 'EQUITY', parentCode: '3000', scheduleIiiGroup: 'SHARE_CAPITAL' },
  { code: '3020', name: 'Retained Earnings', type: 'EQUITY', parentCode: '3000', scheduleIiiGroup: 'RESERVES_AND_SURPLUS' },
  {
    code: '3030',
    name: 'Share Application Money Pending Allotment',
    type: 'EQUITY',
    parentCode: '3000',
    scheduleIiiGroup: 'SHARE_APPLICATION_MONEY',
  },

  { code: '4000', name: 'INCOME', type: 'INCOME', scheduleIiiGroup: 'OTHER_INCOME' },
  { code: '4010', name: 'Platform Fees', type: 'INCOME', parentCode: '4000', scheduleIiiGroup: 'REVENUE_FROM_OPERATIONS' },
  { code: '4020', name: 'Management Fees', type: 'INCOME', parentCode: '4000', scheduleIiiGroup: 'REVENUE_FROM_OPERATIONS' },
  { code: '4030', name: 'Transaction Fees', type: 'INCOME', parentCode: '4000', scheduleIiiGroup: 'REVENUE_FROM_OPERATIONS' },

  { code: '5000', name: 'EXPENSES', type: 'EXPENSE', scheduleIiiGroup: 'OTHER_EXPENSES' },
  { code: '5010', name: 'Bank Charges', type: 'EXPENSE', parentCode: '5000', scheduleIiiGroup: 'OTHER_EXPENSES' },
  { code: '5020', name: 'Payment Gateway Charges', type: 'EXPENSE', parentCode: '5000', scheduleIiiGroup: 'OTHER_EXPENSES' },
  { code: '5030', name: 'Operating Expenses', type: 'EXPENSE', parentCode: '5000', scheduleIiiGroup: 'OTHER_EXPENSES' },
  // Schedule III (Division I) full P&L expense coverage.
  {
    code: '5040',
    name: 'Cost of Materials Consumed',
    type: 'EXPENSE',
    parentCode: '5000',
    scheduleIiiGroup: 'COST_OF_MATERIALS_CONSUMED',
  },
  {
    code: '5050',
    name: 'Purchases of Stock-in-Trade',
    type: 'EXPENSE',
    parentCode: '5000',
    scheduleIiiGroup: 'PURCHASES_OF_STOCK_IN_TRADE',
  },
  {
    code: '5060',
    name: 'Changes in Inventories of Finished Goods, Work-in-Progress and Stock-in-Trade',
    type: 'EXPENSE',
    parentCode: '5000',
    scheduleIiiGroup: 'CHANGES_IN_INVENTORIES',
  },
  { code: '5070', name: 'Employee Benefit Expense', type: 'EXPENSE', parentCode: '5000', scheduleIiiGroup: 'EMPLOYEE_BENEFIT_EXPENSE' },
  {
    code: '5080',
    name: 'Depreciation and Amortization Expense',
    type: 'EXPENSE',
    parentCode: '5000',
    scheduleIiiGroup: 'DEPRECIATION_AND_AMORTIZATION_EXPENSE',
  },
  { code: '5090', name: 'Current Tax', type: 'EXPENSE', parentCode: '5000', scheduleIiiGroup: 'CURRENT_TAX_EXPENSE' },
  { code: '5100', name: 'Deferred Tax', type: 'EXPENSE', parentCode: '5000', scheduleIiiGroup: 'DEFERRED_TAX_EXPENSE' },
];

// Roles — blueprint §2.
const ROLES = [
  { name: 'INVESTOR', description: 'Deposit, invest, receive returns, withdraw' },
  { name: 'ADMIN', description: 'Manage platform' },
  { name: 'INVESTMENT_MANAGER', description: 'Manage investment opportunities' },
  { name: 'FINANCE_OFFICER', description: 'Reconciliation and accounting' },
  { name: 'COMPLIANCE_OFFICER', description: 'KYC/AML' },
  { name: 'APPROVER', description: 'Approve sensitive transactions' },
  { name: 'SUPER_ADMIN', description: 'System configuration' },
];

const SEED_PASSWORD = 'ChangeMe123!';

async function seedChartOfAccounts() {
  const codeToId = new Map<string, string>();

  for (const acc of CHART_OF_ACCOUNTS) {
    const parentAccountId = acc.parentCode ? codeToId.get(acc.parentCode) : undefined;
    const created = await prisma.account.upsert({
      where: { accountCode: acc.code },
      update: {},
      create: {
        accountCode: acc.code,
        accountName: acc.name,
        accountType: acc.type,
        parentAccountId,
        currency: 'INR',
        scheduleIiiGroup: acc.scheduleIiiGroup,
      },
    });
    codeToId.set(acc.code, created.id);
  }
  console.log(`Seeded ${CHART_OF_ACCOUNTS.length} chart-of-accounts entries.`);
}

async function seedRoles() {
  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }
  console.log(`Seeded ${ROLES.length} roles.`);
}

async function seedUserWithRole(
  email: string,
  firstName: string,
  lastName: string,
  roleName: string,
) {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
  const role = await prisma.role.findUniqueOrThrow({ where: { name: roleName } });

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      firstName,
      lastName,
      passwordHash,
      status: 'ACTIVE',
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
    update: {},
    create: { userId: user.id, roleId: role.id },
  });

  return user;
}

async function seedDemoInvestor() {
  const investorUser = await seedUserWithRole(
    'investor.demo@example.com',
    'Demo',
    'Investor',
    'INVESTOR',
  );

  const investor = await prisma.investor.upsert({
    where: { userId: investorUser.id },
    update: {},
    create: {
      userId: investorUser.id,
      investorNumber: 'INV-00001',
      kycStatus: 'VERIFIED',
      amlStatus: 'CLEARED',
      status: 'ACTIVE',
      country: 'Oman',
      nationality: 'Omani',
    },
  });

  await prisma.wallet.upsert({
    where: { investorId: investor.id },
    update: {},
    create: {
      investorId: investor.id,
      walletNumber: 'WAL-00001',
      currency: 'INR',
      status: 'ACTIVE',
    },
  });

  console.log(`Seeded demo investor ${investor.investorNumber} with wallet WAL-00001.`);
}

async function seedDemoInvestmentCatalogue() {
  const company = await prisma.investmentCompany.upsert({
    where: { companyCode: 'CO-0001' },
    update: {},
    create: {
      companyCode: 'CO-0001',
      legalName: 'Demo Real Estate Holdings LLC',
      registrationNumber: 'REG-123456',
      country: 'Oman',
      kycStatus: 'VERIFIED',
      status: 'ACTIVE',
    },
  });

  const product = await prisma.investmentProduct.upsert({
    where: { productCode: 'PROD-BULLET-12M' },
    update: {},
    create: {
      productCode: 'PROD-BULLET-12M',
      name: '12-Month Bullet Note',
      description: 'Principal and ROI repaid together at maturity.',
      minimumAmount: 1000,
      expectedRoi: 10.0,
      roiType: 'BULLET',
      tenureMonths: 12,
      currency: 'INR',
      riskLevel: 'MEDIUM',
      status: 'ACTIVE',
    },
  });

  const startDate = new Date();
  const maturityDate = new Date(startDate);
  maturityDate.setMonth(maturityDate.getMonth() + product.tenureMonths);

  const existingOpportunity = await prisma.investmentOpportunity.findFirst({
    where: { name: 'Demo Opportunity — Bullet 12M' },
  });

  await prisma.investmentOpportunity.upsert({
    where: { id: existingOpportunity?.id ?? '00000000-0000-0000-0000-000000000000' },
    update: {},
    create: {
      productId: product.id,
      companyId: company.id,
      name: 'Demo Opportunity — Bullet 12M',
      targetAmount: 500000,
      minimumInvestment: 1000,
      expectedRoi: 10.0,
      startDate,
      maturityDate,
      status: 'OPEN',
    },
  });

  console.log('Seeded demo investment company/product/opportunity.');
}

async function main() {
  await seedRoles();
  await seedChartOfAccounts();

  await seedUserWithRole('admin@example.com', 'Platform', 'Admin', 'ADMIN');
  await seedUserWithRole('manager@example.com', 'Investment', 'Manager', 'INVESTMENT_MANAGER');
  await seedUserWithRole('finance@example.com', 'Finance', 'Officer', 'FINANCE_OFFICER');
  await seedUserWithRole('compliance@example.com', 'Compliance', 'Officer', 'COMPLIANCE_OFFICER');
  await seedUserWithRole('approver@example.com', 'Sensitive', 'Approver', 'APPROVER');
  await seedUserWithRole('superadmin@example.com', 'Super', 'Admin', 'SUPER_ADMIN');

  await seedDemoInvestor();
  await seedDemoInvestmentCatalogue();

  console.log(`\nAll seeded users share the password: ${SEED_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
