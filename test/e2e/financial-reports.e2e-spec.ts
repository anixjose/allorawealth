import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createTestApp, SEEDED_USERS, SEEDED_PASSWORD, uniqueEmail } from './test-app';

/**
 * Verifies the financial/investor/management reports suite against a real
 * scenario: every report must hold its own accounting invariant (trial
 * balance debit==credit, balance sheet assets==liabilities+equity), and the
 * investor-facing reports must agree with the wallet position the earlier
 * e2e suite already proved correct — these are independent computations of
 * the same underlying ledger, so agreement here is a real cross-check, not
 * a tautology.
 */
describe('Financial / investor / management reports', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let financeToken: string;
  let investorToken: string;
  let investorId: string;
  let opportunityId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = new PrismaClient();

    const login = async (email: string, password = SEEDED_PASSWORD) => {
      const res = await request(app.getHttpServer()).post('/auth/login').send({ email, password });
      expect(res.status).toBe(201);
      return res.body.accessToken as string;
    };
    financeToken = await login(SEEDED_USERS.financeOfficer);
    const adminToken = await login(SEEDED_USERS.admin);

    const email = uniqueEmail('reports-investor');
    const registerRes = await request(app.getHttpServer()).post('/investors/register').send({
      firstName: 'Reports',
      lastName: 'Investor',
      email,
      password: 'InvestorPass123!',
    });
    investorId = registerRes.body.investor.id;

    // Registration lands PENDING_ACTIVATION — approve so this scenario's deposit/invest calls succeed.
    await request(app.getHttpServer())
      .post(`/investors/${investorId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    investorToken = await login(email, 'InvestorPass123!');

    const opportunity = await prisma.investmentOpportunity.findFirstOrThrow({ where: { status: 'OPEN' } });
    opportunityId = opportunity.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('runs a scenario then checks every report holds its invariant and agrees with the wallet position', async () => {
    const paymentReference = `PAY-REPORTS-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

    const depositRes = await request(app.getHttpServer())
      .post('/deposits')
      .set('Authorization', `Bearer ${investorToken}`)
      .send({ investorId, amount: '4000', currency: 'INR', paymentReference })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/deposits/${depositRes.body.id}/approve`)
      .set('Authorization', `Bearer ${financeToken}`)
      .expect(201);

    const investRes = await request(app.getHttpServer())
      .post('/investments')
      .set('Authorization', `Bearer ${investorToken}`)
      .send({ investorId, opportunityId, amount: '1000' })
      .expect(201);
    const scheduleId = investRes.body.repaymentSchedules[0].id;

    await request(app.getHttpServer())
      .post(`/repayment-schedules/${scheduleId}/accrue-roi`)
      .set('Authorization', `Bearer ${financeToken}`)
      .expect(201);

    const roiRepaymentRes = await request(app.getHttpServer())
      .post('/repayments')
      .set('Authorization', `Bearer ${financeToken}`)
      .send({ investmentId: investRes.body.id, scheduleId, roiAmount: '100' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/repayments/disburse')
      .set('Authorization', `Bearer ${financeToken}`)
      .send({ repaymentIds: [roiRepaymentRes.body.id] })
      .expect(201);

    // --- Trial balance: fundamental invariant ---
    const trialBalance = await request(app.getHttpServer())
      .get('/reports/financial/trial-balance')
      .set('Authorization', `Bearer ${financeToken}`)
      .expect(200);
    expect(trialBalance.body.balanced).toBe(true);
    expect(trialBalance.body.totalDebit).toBe(trialBalance.body.totalCredit);

    // --- Balance sheet: Schedule III (Division I) vertical format, assets == equity + liabilities ---
    const balanceSheet = await request(app.getHttpServer())
      .get('/reports/financial/balance-sheet')
      .set('Authorization', `Bearer ${financeToken}`)
      .expect(200);
    expect(balanceSheet.body.balanced).toBe(true);
    expect(balanceSheet.body.equityAndLiabilities.total).toBe(balanceSheet.body.assets.total);

    // Investor wallet/investment liabilities land under Current Liabilities > Other Current Liabilities.
    const currentLiabilityItems = balanceSheet.body.equityAndLiabilities.currentLiabilities.items;
    const otherCurrentLiabilities = currentLiabilityItems.find(
      (i: { group: string }) => i.group === 'OTHER_CURRENT_LIABILITIES',
    );
    expect(otherCurrentLiabilities.accounts.some((a: { accountCode: string }) => a.accountCode === '2010')).toBe(true);
    // Every Schedule III sub-head is always shown, even with a zero balance — Long-term
    // Borrowings has a seeded placeholder account but nothing has ever been posted to it.
    const longTermBorrowings = balanceSheet.body.equityAndLiabilities.nonCurrentLiabilities.items.find(
      (i: { group: string }) => i.group === 'LONG_TERM_BORROWINGS',
    );
    expect(longTermBorrowings).toBeDefined();
    expect(longTermBorrowings.total).toBe('0.00');

    // The deposited cash lands under Current Assets > Cash and Cash Equivalents (Bank Account, 1010).
    const currentAssetItems = balanceSheet.body.assets.currentAssets.items;
    const cashAndCashEquivalents = currentAssetItems.find((i: { group: string }) => i.group === 'CASH_AND_CASH_EQUIVALENTS');
    expect(cashAndCashEquivalents.accounts.some((a: { accountCode: string }) => a.accountCode === '1010')).toBe(true);

    // --- Profit & Loss: Schedule III (Division I) structure; no tax is modeled anywhere in this ledger. ---
    const profitAndLoss = await request(app.getHttpServer())
      .get('/reports/financial/profit-and-loss')
      .set('Authorization', `Bearer ${financeToken}`)
      .expect(200);
    expect(profitAndLoss.body.profitForThePeriod).toBe(profitAndLoss.body.profitBeforeTax);
    expect(typeof profitAndLoss.body.totalRevenue).toBe('string');
    expect(typeof profitAndLoss.body.totalExpenses).toBe('string');
    // Every Schedule III sub-head always appears, tax included, even though nothing is ever posted to it.
    expect(profitAndLoss.body.currentTax.total).toBe('0.00');
    expect(profitAndLoss.body.deferredTax.total).toBe('0.00');
    expect(profitAndLoss.body.costOfMaterialsConsumed.items.length).toBeGreaterThan(0);

    // --- Cash Flow Statement (direct method): reconciles to the actual cash balance, and this
    // scenario's deposit (Financing) and ROI cash receipt (Operating) both appear. ---
    const cashFlow = await request(app.getHttpServer())
      .get('/reports/financial/cash-flow')
      .set('Authorization', `Bearer ${financeToken}`)
      .expect(200);
    expect(cashFlow.body.reconciled).toBe(true);
    expect(
      cashFlow.body.financingActivities.items.some((i: { transactionType: string }) => i.transactionType === 'DEPOSIT'),
    ).toBe(true);
    expect(
      cashFlow.body.operatingActivities.items.some((i: { transactionType: string }) => i.transactionType === 'ROI_RECEIPT'),
    ).toBe(true);

    // --- Cash book: Bank account ledger renders and produces an ending balance ---
    const cashBook = await request(app.getHttpServer())
      .get('/reports/financial/cash-book')
      .set('Authorization', `Bearer ${financeToken}`)
      .expect(200);
    expect(cashBook.body.account.accountCode).toBe('1010');
    expect(typeof cashBook.body.endingBalance).toBe('string');
    // 1010 is the only Cash and Cash Equivalents account seeded, so the two must agree exactly.
    expect(cashFlow.body.cashAtEnd).toBe(cashBook.body.endingBalance);

    // --- Investor liabilities agrees with the wallet position's available balance ---
    const position = await request(app.getHttpServer())
      .get(`/wallets/${investorId}/position`)
      .set('Authorization', `Bearer ${financeToken}`)
      .expect(200);

    const liabilities = await request(app.getHttpServer())
      .get('/reports/financial/investor-liabilities')
      .set('Authorization', `Bearer ${financeToken}`)
      .expect(200);
    const ourRow = liabilities.body.rows.find((r: { investorId: string }) => r.investorId === investorId);
    expect(ourRow.walletLiability).toBe(position.body.availableBalance);

    // --- Investor statement's final running balance agrees with the wallet position ---
    const statement = await request(app.getHttpServer())
      .get(`/reports/investor/${investorId}/statement`)
      .set('Authorization', `Bearer ${financeToken}`)
      .expect(200);
    const lastRow = statement.body.rows[statement.body.rows.length - 1];
    expect(lastRow.balance).toBe(position.body.availableBalance);

    // --- ROI statement shows both the accrual and the receipt ---
    const roiStatement = await request(app.getHttpServer())
      .get(`/reports/investor/${investorId}/roi-statement`)
      .set('Authorization', `Bearer ${financeToken}`)
      .expect(200);
    expect(roiStatement.body.rows).toHaveLength(2);
    expect(roiStatement.body.rows.map((r: { type: string }) => r.type).sort()).toEqual(['ACCRUED', 'RECEIVED']);

    // --- Repayment statement shows the ROI repayment ---
    const repaymentStatement = await request(app.getHttpServer())
      .get(`/reports/investor/${investorId}/repayment-statement`)
      .set('Authorization', `Bearer ${financeToken}`)
      .expect(200);
    expect(repaymentStatement.body.rows).toHaveLength(1);
    expect(repaymentStatement.body.rows[0].roiAmount).toBe('100.00');

    // --- Management report shape ---
    const management = await request(app.getHttpServer())
      .get('/reports/management')
      .set('Authorization', `Bearer ${financeToken}`)
      .expect(200);
    expect(management.body.maturityAnalysis.length).toBeGreaterThan(0);
    expect(management.body.defaultedInvestments).toEqual(
      expect.objectContaining({ count: expect.any(Number) }),
    );

    // --- Mark-as-defaulted action feeds the Defaulted Investments report ---
    const defaultRes = await request(app.getHttpServer())
      .post(`/investments/${investRes.body.id}/default`)
      .set('Authorization', `Bearer ${financeToken}`)
      .send({ reason: 'Borrower missed three consecutive payments' })
      .expect(201);
    expect(defaultRes.body.status).toBe('DEFAULTED');

    const managementAfterDefault = await request(app.getHttpServer())
      .get('/reports/management')
      .set('Authorization', `Bearer ${financeToken}`)
      .expect(200);
    expect(managementAfterDefault.body.defaultedInvestments.count).toBeGreaterThanOrEqual(1);
    expect(
      managementAfterDefault.body.defaultedInvestments.items.some(
        (i: { investmentNumber: string }) => i.investmentNumber === investRes.body.investmentNumber,
      ),
    ).toBe(true);

    // Maker-checker style guard: an already-defaulted investment cannot be defaulted again.
    await request(app.getHttpServer())
      .post(`/investments/${investRes.body.id}/default`)
      .set('Authorization', `Bearer ${financeToken}`)
      .send({ reason: 'duplicate attempt' })
      .expect(400);
  });
});
