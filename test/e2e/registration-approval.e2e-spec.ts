import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createTestApp, SEEDED_USERS, SEEDED_PASSWORD, uniqueEmail } from './test-app';

/**
 * New investor/business registrations must land PENDING_ACTIVATION and be
 * blocked from transacting until an admin approves them — they can still
 * log in and browse. Business registrations additionally get a BUS-prefixed
 * number via the same underlying Investor row (entityType discriminator).
 */
describe('Registration approval gate (individuals + businesses)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let adminToken: string;
  let opportunityId: string;

  const login = async (email: string, password = SEEDED_PASSWORD) => {
    const res = await request(app.getHttpServer()).post('/auth/login').send({ email, password });
    expect(res.status).toBe(201);
    return res.body.accessToken as string;
  };

  beforeAll(async () => {
    app = await createTestApp();
    prisma = new PrismaClient();
    adminToken = await login(SEEDED_USERS.admin);
    const opportunity = await prisma.investmentOpportunity.findFirstOrThrow({ where: { status: 'OPEN' } });
    opportunityId = opportunity.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('registers a business with a BUS-prefixed number, pending activation, blocked from transacting until approved', async () => {
    const email = uniqueEmail('reg-approval-business');
    const registrationNumber = `REG-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

    const registerRes = await request(app.getHttpServer())
      .post('/investors/register-business')
      .send({
        businessName: 'Acme Trading Co',
        registrationNumber,
        email,
        password: 'BusinessPass123!',
      })
      .expect(201);

    const investorId = registerRes.body.investor.id as string;
    expect(registerRes.body.investor.investorNumber).toMatch(/^BUS-\d{6}$/);
    expect(registerRes.body.investor.status).toBe('PENDING_ACTIVATION');
    expect(registerRes.body.investor.entityType).toBe('BUSINESS');

    const businessToken = await login(email, 'BusinessPass123!');

    // Can log in and read own profile while pending.
    const meRes = await request(app.getHttpServer())
      .get('/investors/me')
      .set('Authorization', `Bearer ${businessToken}`)
      .expect(200);
    expect(meRes.body.status).toBe('PENDING_ACTIVATION');

    // Cannot deposit while pending.
    const blockedDeposit = await request(app.getHttpServer())
      .post('/deposits')
      .set('Authorization', `Bearer ${businessToken}`)
      .send({
        investorId,
        amount: '500',
        currency: 'INR',
        paymentReference: `PAY-PENDING-${Date.now()}`,
      });
    expect(blockedDeposit.status).toBe(403);

    // Admin approves.
    const approveRes = await request(app.getHttpServer())
      .post(`/investors/${investorId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);
    expect(approveRes.body.status).toBe('ACTIVE');

    // Approving twice is rejected.
    await request(app.getHttpServer())
      .post(`/investors/${investorId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);

    // Now the deposit succeeds.
    const allowedDeposit = await request(app.getHttpServer())
      .post('/deposits')
      .set('Authorization', `Bearer ${businessToken}`)
      .send({
        investorId,
        amount: '500',
        currency: 'INR',
        paymentReference: `PAY-APPROVED-${Date.now()}`,
      });
    expect(allowedDeposit.status).toBe(201);
    expect(allowedDeposit.body.status).toBe('PENDING');
  });

  it('a pending individual investor is blocked from withdrawing and investing too', async () => {
    const email = uniqueEmail('reg-approval-individual');
    const registerRes = await request(app.getHttpServer())
      .post('/investors/register')
      .send({ firstName: 'Pending', lastName: 'Investor', email, password: 'InvestorPass123!' })
      .expect(201);
    const investorId = registerRes.body.investor.id as string;
    expect(registerRes.body.investor.status).toBe('PENDING_ACTIVATION');

    const token = await login(email, 'InvestorPass123!');

    const blockedWithdrawal = await request(app.getHttpServer())
      .post('/withdrawals')
      .set('Authorization', `Bearer ${token}`)
      .send({ investorId, amount: '100', currency: 'INR' });
    expect(blockedWithdrawal.status).toBe(403);

    const blockedInvestment = await request(app.getHttpServer())
      .post('/investments')
      .set('Authorization', `Bearer ${token}`)
      .send({ investorId, opportunityId, amount: '1000' });
    expect(blockedInvestment.status).toBe(403);
  });
});
