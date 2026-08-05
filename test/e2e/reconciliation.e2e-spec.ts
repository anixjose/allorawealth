import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createTestApp, SEEDED_USERS, SEEDED_PASSWORD, uniqueEmail } from './test-app';

/**
 * Runs a small deposit/invest/ROI/withdrawal scenario for a fresh investor,
 * then asserts the GL <-> investor sub-ledger reconciliation (the
 * blueprint's mandatory reconciliation control) shows RECONCILED with a
 * zero difference on every control account it checks (2010, 2020, 2030).
 * This holds regardless of how much prior data exists in the (persistent)
 * test database, because every business event in this system is always
 * posted as a balanced double-entry journal — the reconciliation is an
 * independent cross-check of that invariant, not something that depends
 * on starting from an empty ledger.
 */
describe('GL <-> Investor sub-ledger reconciliation', () => {
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

    const email = uniqueEmail('reconciliation-investor');
    const registerRes = await request(app.getHttpServer()).post('/investors/register').send({
      firstName: 'Reconciliation',
      lastName: 'Investor',
      email,
      password: 'InvestorPass123!',
    });
    investorId = registerRes.body.investor.id;

    // Registration lands PENDING_ACTIVATION — approve so this scenario's deposit/invest/withdraw calls succeed.
    await request(app.getHttpServer())
      .post(`/investors/${investorId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    investorToken = await login(email, 'InvestorPass123!');

    const opportunity = await prisma.investmentOpportunity.findFirstOrThrow({
      where: { status: 'OPEN' },
    });
    opportunityId = opportunity.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('reconciles to zero after deposit, investment, ROI accrual/receipt, and a pending withdrawal', async () => {
    const paymentReference = `PAY-REC-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

    const depositRes = await request(app.getHttpServer())
      .post('/deposits')
      .set('Authorization', `Bearer ${investorToken}`)
      .send({ investorId, amount: '5000', currency: 'INR', paymentReference })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/deposits/${depositRes.body.id}/approve`)
      .set('Authorization', `Bearer ${financeToken}`)
      .expect(201);

    const investRes = await request(app.getHttpServer())
      .post('/investments')
      .set('Authorization', `Bearer ${investorToken}`)
      .send({ investorId, opportunityId, amount: '2000' })
      .expect(201);
    const investmentId = investRes.body.id;
    const scheduleId = investRes.body.repaymentSchedules[0].id;

    await request(app.getHttpServer())
      .post(`/repayment-schedules/${scheduleId}/accrue-roi`)
      .set('Authorization', `Bearer ${financeToken}`)
      .expect(201);

    await request(app.getHttpServer())
      .post('/repayments')
      .set('Authorization', `Bearer ${financeToken}`)
      .send({ investmentId, scheduleId, roiAmount: '200' })
      .expect(201);

    // Leave a withdrawal PENDING (unapproved) so the sub-ledger includes an
    // in-flight case too, not just fully-settled transactions.
    await request(app.getHttpServer())
      .post('/withdrawals')
      .set('Authorization', `Bearer ${investorToken}`)
      .send({ investorId, amount: '500', currency: 'INR' })
      .expect(201);

    const runRes = await request(app.getHttpServer())
      .post('/reconciliation/run')
      .set('Authorization', `Bearer ${financeToken}`);

    expect(runRes.status).toBe(201);
    expect(runRes.body).toHaveLength(3);

    for (const reconciliation of runRes.body) {
      expect(reconciliation.status).toBe('RECONCILED');
      expect(reconciliation.difference).toBe('0');
      expect(reconciliation.items).toHaveLength(0);
    }
  });
});
