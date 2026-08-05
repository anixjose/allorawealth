import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createTestApp, SEEDED_USERS, SEEDED_PASSWORD, uniqueEmail } from './test-app';

describe('Deposit maker-checker + investment target-amount cap', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let financeToken: string;
  let adminToken: string;

  const login = async (email: string, password = SEEDED_PASSWORD) => {
    const res = await request(app.getHttpServer()).post('/auth/login').send({ email, password });
    expect(res.status).toBe(201);
    return res.body.accessToken as string;
  };

  const registerInvestor = async (prefix: string) => {
    const email = uniqueEmail(prefix);
    const res = await request(app.getHttpServer()).post('/investors/register').send({
      firstName: 'Test',
      lastName: 'Investor',
      email,
      password: 'InvestorPass123!',
    });
    expect(res.status).toBe(201);
    const investorId = res.body.investor.id as string;

    // Registration lands PENDING_ACTIVATION — approve immediately so this test's
    // deposit/investment calls (unrelated to the approval gate itself) succeed.
    await request(app.getHttpServer())
      .post(`/investors/${investorId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    const token = await login(email, 'InvestorPass123!');
    return { investorId, token };
  };

  beforeAll(async () => {
    app = await createTestApp();
    prisma = new PrismaClient();
    financeToken = await login(SEEDED_USERS.financeOfficer);
    adminToken = await login(SEEDED_USERS.admin);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('rejecting a deposit never touches the ledger, and the requester cannot self-approve', async () => {
    const { investorId, token } = await registerInvestor('reject-deposit');
    const paymentReference = `PAY-REJECT-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

    const requestRes = await request(app.getHttpServer())
      .post('/deposits')
      .set('Authorization', `Bearer ${token}`)
      .send({ investorId, amount: '2500', currency: 'INR', paymentReference })
      .expect(201);
    const depositId = requestRes.body.id;

    // Maker cannot approve their own request.
    await request(app.getHttpServer())
      .post(`/deposits/${depositId}/approve`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    const rejectRes = await request(app.getHttpServer())
      .post(`/deposits/${depositId}/reject`)
      .set('Authorization', `Bearer ${financeToken}`)
      .send({ reason: 'Could not verify the bank transfer' })
      .expect(201);
    expect(rejectRes.body.status).toBe('REJECTED');

    const position = await request(app.getHttpServer())
      .get(`/wallets/${investorId}/position`)
      .set('Authorization', `Bearer ${financeToken}`)
      .expect(200);
    expect(position.body.availableBalance).toBe('0.00');

    // A rejected deposit cannot later be approved.
    await request(app.getHttpServer())
      .post(`/deposits/${depositId}/approve`)
      .set('Authorization', `Bearer ${financeToken}`)
      .expect(400);
  });

  it('caps investment at the opportunity target amount and flips it to FULLY_FUNDED', async () => {
    const managerToken = adminToken;

    const product = await prisma.investmentProduct.findFirstOrThrow({ where: { productCode: 'PROD-BULLET-12M' } });
    const company = await prisma.investmentCompany.findFirstOrThrow({ where: { companyCode: 'CO-0001' } });

    const opportunityRes = await request(app.getHttpServer())
      .post('/investment-opportunities')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        productId: product.id,
        companyId: company.id,
        name: 'Capped Test Opportunity',
        targetAmount: '3000',
        minimumInvestment: '1000',
        expectedRoi: '10',
        startDate: new Date().toISOString(),
        maturityDate: new Date(Date.now() + 365 * 86_400_000).toISOString(),
      })
      .expect(201);
    const opportunityId = opportunityRes.body.id;

    const investorA = await registerInvestor('cap-investor-a');
    const investorB = await registerInvestor('cap-investor-b');
    const investorC = await registerInvestor('cap-investor-c');

    // Fund each investor's wallet well above what they'll try to invest.
    for (const investor of [investorA, investorB, investorC]) {
      const paymentReference = `PAY-CAP-${investor.investorId}-${Date.now()}`;
      const depositRes = await request(app.getHttpServer())
        .post('/deposits')
        .set('Authorization', `Bearer ${investor.token}`)
        .send({ investorId: investor.investorId, amount: '2000', currency: 'INR', paymentReference })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/deposits/${depositRes.body.id}/approve`)
        .set('Authorization', `Bearer ${financeToken}`)
        .expect(201);
    }

    // A and B race to invest 1600 each against a 3000 target — only one can fit (3200 > 3000).
    const [resA, resB] = await Promise.all([
      request(app.getHttpServer())
        .post('/investments')
        .set('Authorization', `Bearer ${investorA.token}`)
        .send({ investorId: investorA.investorId, opportunityId, amount: '1600' }),
      request(app.getHttpServer())
        .post('/investments')
        .set('Authorization', `Bearer ${investorB.token}`)
        .send({ investorId: investorB.investorId, opportunityId, amount: '1600' }),
    ]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([201, 400]);

    const winner = resA.status === 201 ? resA : resB;
    expect(winner.body.principalAmount).toBe('1600');

    // The remaining 1400 fits exactly, filling the opportunity to its target.
    const fillRes = await request(app.getHttpServer())
      .post('/investments')
      .set('Authorization', `Bearer ${investorC.token}`)
      .send({ investorId: investorC.investorId, opportunityId, amount: '1400' })
      .expect(201);
    expect(fillRes.body.principalAmount).toBe('1400');

    const opportunityAfter = await prisma.investmentOpportunity.findUniqueOrThrow({ where: { id: opportunityId } });
    expect(opportunityAfter.status).toBe('FULLY_FUNDED');

    // Any further investment attempt is rejected by the pre-existing OPEN-only check.
    const overflowRes = await request(app.getHttpServer())
      .post('/investments')
      .set('Authorization', `Bearer ${investorA.token}`)
      .send({ investorId: investorA.investorId, opportunityId, amount: '100' });
    expect(overflowRes.status).toBe(400);
    expect(overflowRes.body.error.message).toMatch(/not open for investment/);
  });
});
