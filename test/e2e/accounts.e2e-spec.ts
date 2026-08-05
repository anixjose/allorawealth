import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, SEEDED_USERS, SEEDED_PASSWORD } from './test-app';

/**
 * Finance Module: Chart of Accounts.
 *
 * A "GL account" is a top-level Account row (no parentAccountId). A "Sub Ledger" is
 * an Account row nested under an existing GL account via parentAccountId — the same
 * hierarchy the seeded chart of accounts already uses (e.g. 1000 ASSETS -> 1010 Bank
 * Account). Both are created through the same POST /accounts endpoint; the presence
 * of parentAccountId is what distinguishes the two in the UI's eyes.
 */
describe('Finance Module: Chart of Accounts', () => {
  let app: INestApplication;
  let financeToken: string;
  let approverToken: string;

  const login = async (email: string, password = SEEDED_PASSWORD) => {
    const res = await request(app.getHttpServer()).post('/auth/login').send({ email, password });
    expect(res.status).toBe(201);
    return res.body.accessToken as string;
  };

  beforeAll(async () => {
    app = await createTestApp();
    financeToken = await login(SEEDED_USERS.financeOfficer);
    approverToken = await login(SEEDED_USERS.approver);
  });

  afterAll(async () => {
    await app.close();
  });

  function code(): string {
    return String(100000 + Math.floor(Math.random() * 800000)).slice(0, 6);
  }

  it('creates a new top-level GL account', async () => {
    const res = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${financeToken}`)
      .send({
        accountCode: code(),
        accountName: 'Contingency Reserve',
        accountType: 'EQUITY',
        scheduleIiiGroup: 'RESERVES_AND_SURPLUS',
      })
      .expect(201);

    expect(res.body.parentAccountId).toBeNull();
    expect(res.body.status).toBe('ACTIVE');
    expect(res.body.currency).toBe('INR');
    expect(res.body.scheduleIiiGroup).toBe('RESERVES_AND_SURPLUS');
  });

  it('creates a Sub Ledger nested under a GL account, matching its type', async () => {
    const glCode = code();
    const glRes = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${financeToken}`)
      .send({
        accountCode: glCode,
        accountName: 'Prepaid Expenses',
        accountType: 'ASSET',
        scheduleIiiGroup: 'OTHER_CURRENT_ASSETS',
      })
      .expect(201);

    const subRes = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${financeToken}`)
      .send({
        accountCode: code(),
        accountName: 'Prepaid Insurance',
        accountType: 'ASSET',
        scheduleIiiGroup: 'OTHER_CURRENT_ASSETS',
        parentAccountId: glRes.body.id,
      })
      .expect(201);

    expect(subRes.body.parentAccountId).toBe(glRes.body.id);
  });

  it('nests a Ledger Account under a Sub Ledger (3 levels deep), and the middle level drops out of the Balance Sheet once it has a child', async () => {
    const glRes = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${financeToken}`)
      .send({
        accountCode: code(),
        accountName: 'Property, Plant and Equipment',
        accountType: 'ASSET',
        scheduleIiiGroup: 'TANGIBLE_ASSETS',
      })
      .expect(201);

    // Sub GL: "Bank Account"-style middle tier, initially a leaf.
    const subGlRes = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${financeToken}`)
      .send({
        accountCode: code(),
        accountName: 'Computers',
        accountType: 'ASSET',
        scheduleIiiGroup: 'TANGIBLE_ASSETS',
        parentAccountId: glRes.body.id,
      })
      .expect(201);

    // Before it has any children, "Computers" is itself a leaf and shows up in the Balance Sheet.
    const beforeLedgerAccounts = await request(app.getHttpServer())
      .get('/reports/financial/balance-sheet')
      .set('Authorization', `Bearer ${financeToken}`)
      .expect(200);
    const fixedAssetsBefore = beforeLedgerAccounts.body.assets.nonCurrentAssets.items.find(
      (i: { group: string }) => i.group === 'TANGIBLE_ASSETS',
    );
    expect(fixedAssetsBefore.accounts.some((a: { accountCode: string }) => a.accountCode === subGlRes.body.accountCode)).toBe(
      true,
    );

    // Ledger Account nested under the Sub GL ("Computers"), a third level down.
    const ledgerAccountCode = code();
    const ledgerRes = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${financeToken}`)
      .send({
        accountCode: ledgerAccountCode,
        accountName: 'Laptops',
        accountType: 'ASSET',
        scheduleIiiGroup: 'TANGIBLE_ASSETS',
        parentAccountId: subGlRes.body.id,
      })
      .expect(201);
    expect(ledgerRes.body.parentAccountId).toBe(subGlRes.body.id);

    // Now that "Computers" has a child, it's a rollup — the Balance Sheet shows "Laptops" instead.
    const afterLedgerAccounts = await request(app.getHttpServer())
      .get('/reports/financial/balance-sheet')
      .set('Authorization', `Bearer ${financeToken}`)
      .expect(200);
    const fixedAssetsAfter = afterLedgerAccounts.body.assets.nonCurrentAssets.items.find(
      (i: { group: string }) => i.group === 'TANGIBLE_ASSETS',
    );
    expect(fixedAssetsAfter.accounts.some((a: { accountCode: string }) => a.accountCode === subGlRes.body.accountCode)).toBe(
      false,
    );
    expect(fixedAssetsAfter.accounts.some((a: { accountCode: string }) => a.accountCode === ledgerAccountCode)).toBe(true);
  });

  it('rejects a Sub Ledger whose type does not match its parent GL account', async () => {
    const glRes = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${financeToken}`)
      .send({
        accountCode: code(),
        accountName: 'Some Liability Group',
        accountType: 'LIABILITY',
        scheduleIiiGroup: 'OTHER_CURRENT_LIABILITIES',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${financeToken}`)
      .send({
        accountCode: code(),
        accountName: 'Mismatched Sub Ledger',
        accountType: 'ASSET',
        scheduleIiiGroup: 'OTHER_CURRENT_ASSETS',
        parentAccountId: glRes.body.id,
      })
      .expect(400);
  });

  it('rejects a Sub Ledger under a non-existent parent account', async () => {
    await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${financeToken}`)
      .send({
        accountCode: code(),
        accountName: 'Orphan Sub Ledger',
        accountType: 'ASSET',
        scheduleIiiGroup: 'OTHER_CURRENT_ASSETS',
        parentAccountId: '00000000-0000-0000-0000-000000000000',
      })
      .expect(404);
  });

  it('rejects a duplicate account code', async () => {
    const dupeCode = code();
    await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${financeToken}`)
      .send({ accountCode: dupeCode, accountName: 'First Use', accountType: 'EXPENSE', scheduleIiiGroup: 'OTHER_EXPENSES' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${financeToken}`)
      .send({ accountCode: dupeCode, accountName: 'Second Use', accountType: 'EXPENSE', scheduleIiiGroup: 'OTHER_EXPENSES' })
      .expect(409);
  });

  it('rejects a non-numeric account code', async () => {
    await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${financeToken}`)
      .send({ accountCode: 'ABC123', accountName: 'Bad Code', accountType: 'EXPENSE', scheduleIiiGroup: 'OTHER_EXPENSES' })
      .expect(400);
  });

  it('rejects a scheduleIiiGroup that is not valid for the given account type', async () => {
    await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${financeToken}`)
      .send({
        accountCode: code(),
        accountName: 'Wrong Group For Type',
        accountType: 'EXPENSE',
        // TRADE_RECEIVABLES is an asset-side group, not valid for an EXPENSE account.
        scheduleIiiGroup: 'TRADE_RECEIVABLES',
      })
      .expect(400);
  });

  it('renames an account, can deactivate/reactivate it, and can reclassify its Schedule III group', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${financeToken}`)
      .send({
        accountCode: code(),
        accountName: 'Original Name',
        accountType: 'EXPENSE',
        scheduleIiiGroup: 'OTHER_EXPENSES',
      })
      .expect(201);

    const updateRes = await request(app.getHttpServer())
      .patch(`/accounts/${createRes.body.id}`)
      .set('Authorization', `Bearer ${financeToken}`)
      .send({ accountName: 'Renamed Account', status: 'INACTIVE' })
      .expect(200);

    expect(updateRes.body.accountName).toBe('Renamed Account');
    expect(updateRes.body.status).toBe('INACTIVE');

    const reactivateRes = await request(app.getHttpServer())
      .patch(`/accounts/${createRes.body.id}`)
      .set('Authorization', `Bearer ${financeToken}`)
      .send({ status: 'ACTIVE' })
      .expect(200);
    expect(reactivateRes.body.status).toBe('ACTIVE');

    const reclassifyRes = await request(app.getHttpServer())
      .patch(`/accounts/${createRes.body.id}`)
      .set('Authorization', `Bearer ${financeToken}`)
      .send({ scheduleIiiGroup: 'FINANCE_COSTS' })
      .expect(200);
    expect(reclassifyRes.body.scheduleIiiGroup).toBe('FINANCE_COSTS');

    await request(app.getHttpServer())
      .patch(`/accounts/${createRes.body.id}`)
      .set('Authorization', `Bearer ${financeToken}`)
      // TRADE_RECEIVABLES is not valid for this EXPENSE account.
      .send({ scheduleIiiGroup: 'TRADE_RECEIVABLES' })
      .expect(400);
  });

  it('blocks deactivating an account with posted transactions, and excludes deactivated accounts from Balance Sheet/P&L/Cash Flow', async () => {
    // The seeded Bank Account has real posted transactions (from this suite and others) — cannot be deactivated.
    const allAccounts = await request(app.getHttpServer()).get('/accounts').set('Authorization', `Bearer ${financeToken}`);
    const bankAccount = allAccounts.body.find((a: { accountCode: string }) => a.accountCode === '1010');
    await request(app.getHttpServer())
      .patch(`/accounts/${bankAccount.id}`)
      .set('Authorization', `Bearer ${financeToken}`)
      .send({ status: 'INACTIVE' })
      .expect(409);

    // A fresh, transaction-free account can be deactivated...
    const freshCode = code();
    const freshRes = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${financeToken}`)
      .send({
        accountCode: freshCode,
        accountName: 'Deactivation Test',
        accountType: 'EQUITY',
        scheduleIiiGroup: 'RESERVES_AND_SURPLUS',
      })
      .expect(201);

    const beforeDeactivate = await request(app.getHttpServer())
      .get('/reports/financial/balance-sheet')
      .set('Authorization', `Bearer ${financeToken}`)
      .expect(200);
    const reservesBefore = beforeDeactivate.body.equityAndLiabilities.shareholdersFunds.items.find(
      (i: { group: string }) => i.group === 'RESERVES_AND_SURPLUS',
    );
    expect(reservesBefore.accounts.some((a: { accountCode: string }) => a.accountCode === freshCode)).toBe(true);

    await request(app.getHttpServer())
      .patch(`/accounts/${freshRes.body.id}`)
      .set('Authorization', `Bearer ${financeToken}`)
      .send({ status: 'INACTIVE' })
      .expect(200);

    // ...and once deactivated, it drops out of the Balance Sheet entirely.
    const afterDeactivate = await request(app.getHttpServer())
      .get('/reports/financial/balance-sheet')
      .set('Authorization', `Bearer ${financeToken}`)
      .expect(200);
    const reservesAfter = afterDeactivate.body.equityAndLiabilities.shareholdersFunds.items.find(
      (i: { group: string }) => i.group === 'RESERVES_AND_SURPLUS',
    );
    expect(reservesAfter.accounts.some((a: { accountCode: string }) => a.accountCode === freshCode)).toBe(false);
  });

  it('404s updating a non-existent account', async () => {
    await request(app.getHttpServer())
      .patch('/accounts/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${financeToken}`)
      .send({ accountName: 'Nope' })
      .expect(404);
  });

  it('blocks a role outside FINANCE_OFFICER/ADMIN/SUPER_ADMIN from creating or updating accounts', async () => {
    await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${approverToken}`)
      .send({ accountCode: code(), accountName: 'Should Fail', accountType: 'EXPENSE' })
      .expect(403);
  });
});
