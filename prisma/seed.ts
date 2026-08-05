import { PrismaClient, AccountType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Chart of accounts — blueprint §12, exact codes.
const CHART_OF_ACCOUNTS: Array<{
  code: string;
  name: string;
  type: AccountType;
  parentCode?: string;
}> = [
  { code: '1000', name: 'ASSETS', type: 'ASSET' },
  { code: '1010', name: 'Bank Account', type: 'ASSET', parentCode: '1000' },
  { code: '1020', name: 'Payment Gateway Receivable', type: 'ASSET', parentCode: '1000' },
  { code: '1030', name: 'Investment Receivable', type: 'ASSET', parentCode: '1000' },
  { code: '1040', name: 'Other Receivables', type: 'ASSET', parentCode: '1000' },

  { code: '2000', name: 'LIABILITIES', type: 'LIABILITY' },
  { code: '2010', name: 'Investor Wallet Liability', type: 'LIABILITY', parentCode: '2000' },
  { code: '2020', name: 'Investor Investment Payable', type: 'LIABILITY', parentCode: '2000' },
  { code: '2030', name: 'Investor ROI Payable', type: 'LIABILITY', parentCode: '2000' },
  { code: '2040', name: 'Investor Withdrawal Payable', type: 'LIABILITY', parentCode: '2000' },

  { code: '3000', name: 'EQUITY', type: 'EQUITY' },
  { code: '3010', name: 'Share Capital', type: 'EQUITY', parentCode: '3000' },
  { code: '3020', name: 'Retained Earnings', type: 'EQUITY', parentCode: '3000' },

  { code: '4000', name: 'INCOME', type: 'INCOME' },
  { code: '4010', name: 'Platform Fees', type: 'INCOME', parentCode: '4000' },
  { code: '4020', name: 'Management Fees', type: 'INCOME', parentCode: '4000' },
  { code: '4030', name: 'Transaction Fees', type: 'INCOME', parentCode: '4000' },

  { code: '5000', name: 'EXPENSES', type: 'EXPENSE' },
  { code: '5010', name: 'Bank Charges', type: 'EXPENSE', parentCode: '5000' },
  { code: '5020', name: 'Payment Gateway Charges', type: 'EXPENSE', parentCode: '5000' },
  { code: '5030', name: 'Operating Expenses', type: 'EXPENSE', parentCode: '5000' },
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
