import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createTestApp, SEEDED_PASSWORD, SEEDED_USERS, uniqueEmail } from './test-app';

/**
 * Reproduces the blueprint's own worked example end-to-end (§20/§21):
 * deposit 10,000 -> invest 6,000 -> ROI 600 -> principal repayment 6,000
 * -> withdraw 3,000 -> available balance 7,600. Assertions are delta-based
 * (before/after) rather than absolute, since this investor's wallet starts
 * empty but the check should hold regardless of how many times the suite
 * has run against this (persistent) test database.
 */
describe('Investor lifecycle (deposit -> invest -> ROI -> repayment -> withdrawal)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  let financeToken: string;
  let approverToken: string;
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
    approverToken = await login(SEEDED_USERS.approver);
    const adminToken = await login(SEEDED_USERS.admin);

    const email = uniqueEmail('lifecycle-investor');
    const registerRes = await request(app.getHttpServer()).post('/investors/register').send({
      firstName: 'Lifecycle',
      lastName: 'Investor',
      email,
      password: 'InvestorPass123!',
    });
    expect(registerRes.status).toBe(201);
    investorId = registerRes.body.investor.id;

    // Registration lands PENDING_ACTIVATION — approve so this lifecycle's deposit/invest/withdraw calls succeed.
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

  it('runs the full deposit -> invest -> ROI -> repayment -> withdrawal scenario', async () => {
    const paymentReference = `PAY-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

    // 1. Deposit 10,000: request (investor) -> not yet effective -> approve (finance, different actor) -> effective.
    const depositRes = await request(app.getHttpServer())
      .post('/deposits')
      .set('Authorization', `Bearer ${investorToken}`)
      .send({ investorId, amount: '10000', currency: 'INR', paymentReference });
    expect(depositRes.status).toBe(201);
    expect(depositRes.body.status).toBe('PENDING');
    const depositId = depositRes.body.id;

    // Idempotency: replaying the same payment_reference must not create a second request.
    const replayRes = await request(app.getHttpServer())
      .post('/deposits')
      .set('Authorization', `Bearer ${investorToken}`)
      .send({ investorId, amount: '10000', currency: 'INR', paymentReference });
    expect(replayRes.status).toBe(201);
    expect(replayRes.body.id).toBe(depositId);

    let position = await request(app.getHttpServer())
      .get(`/wallets/${investorId}/position`)
      .set('Authorization', `Bearer ${financeToken}`);
    // Requesting a deposit must NOT move the available balance yet.
    expect(position.body.availableBalance).toBe('0.00');

    // Maker-checker: the investor who requested cannot approve their own deposit.
    const selfApproveDepositRes = await request(app.getHttpServer())
      .post(`/deposits/${depositId}/approve`)
      .set('Authorization', `Bearer ${investorToken}`);
    expect(selfApproveDepositRes.status).toBe(403);

    const approveDepositRes = await request(app.getHttpServer())
      .post(`/deposits/${depositId}/approve`)
      .set('Authorization', `Bearer ${financeToken}`);
    expect(approveDepositRes.status).toBe(201);
    expect(approveDepositRes.body.status).toBe('APPROVED');

    position = await request(app.getHttpServer())
      .get(`/wallets/${investorId}/position`)
      .set('Authorization', `Bearer ${financeToken}`);
    expect(position.body.availableBalance).toBe('10000.00');

    // 2. Invest 6,000
    const investRes = await request(app.getHttpServer())
      .post('/investments')
      .set('Authorization', `Bearer ${investorToken}`)
      .send({ investorId, opportunityId, amount: '6000' });
    expect(investRes.status).toBe(201);
    const investmentId = investRes.body.id;
    const scheduleId = investRes.body.repaymentSchedules[0].id;

    position = await request(app.getHttpServer())
      .get(`/wallets/${investorId}/position`)
      .set('Authorization', `Bearer ${financeToken}`);
    expect(position.body.availableBalance).toBe('4000.00');
    expect(position.body.investedPrincipal).toBe('6000.00');

    // 3. ROI: accrue then receive 600 (10% of 6,000, per the seeded BULLET product).
    const accrueRes = await request(app.getHttpServer())
      .post(`/repayment-schedules/${scheduleId}/accrue-roi`)
      .set('Authorization', `Bearer ${financeToken}`);
    expect(accrueRes.status).toBe(201);

    const roiRepaymentRes = await request(app.getHttpServer())
      .post('/repayments')
      .set('Authorization', `Bearer ${financeToken}`)
      .send({ investmentId, scheduleId, roiAmount: '600' });
    expect(roiRepaymentRes.status).toBe(201);
    expect(roiRepaymentRes.body.status).toBe('RECEIVED');
    const roiRepaymentId = roiRepaymentRes.body.id;

    // Recording a repayment must NOT credit the wallet yet — that's disbursement's job.
    position = await request(app.getHttpServer())
      .get(`/wallets/${investorId}/position`)
      .set('Authorization', `Bearer ${financeToken}`);
    expect(position.body.availableBalance).toBe('4000.00');
    expect(position.body.realisedRoi).toBe('0.00');

    const disburseRoiRes = await request(app.getHttpServer())
      .post('/repayments/disburse')
      .set('Authorization', `Bearer ${financeToken}`)
      .send({ repaymentIds: [roiRepaymentId] });
    expect(disburseRoiRes.status).toBe(201);
    expect(disburseRoiRes.body.results).toEqual([{ repaymentId: roiRepaymentId, success: true }]);

    position = await request(app.getHttpServer())
      .get(`/wallets/${investorId}/position`)
      .set('Authorization', `Bearer ${financeToken}`);
    expect(position.body.availableBalance).toBe('4600.00');
    expect(position.body.realisedRoi).toBe('600.00');

    // 4. Principal repayment 6,000 -> investment closes on record, wallet credited only on disbursement.
    const principalRepaymentRes = await request(app.getHttpServer())
      .post('/repayments')
      .set('Authorization', `Bearer ${financeToken}`)
      .send({ investmentId, scheduleId, principalAmount: '6000' });
    expect(principalRepaymentRes.status).toBe(201);
    expect(principalRepaymentRes.body.status).toBe('RECEIVED');
    const principalRepaymentId = principalRepaymentRes.body.id;

    const closedInvestment = await request(app.getHttpServer())
      .get(`/investments/${investmentId}`)
      .set('Authorization', `Bearer ${financeToken}`);
    expect(closedInvestment.body.status).toBe('CLOSED');

    position = await request(app.getHttpServer())
      .get(`/wallets/${investorId}/position`)
      .set('Authorization', `Bearer ${financeToken}`);
    // The investment closes as soon as the company's obligation is recorded as
    // fulfilled, independent of disbursement — so investedPrincipal drops to
    // 0 immediately, even though the cash hasn't reached the wallet yet.
    expect(position.body.availableBalance).toBe('4600.00');
    expect(position.body.investedPrincipal).toBe('0.00');

    // Bulk-disburse alongside a bogus id to prove partial-failure reporting.
    const disbursePrincipalRes = await request(app.getHttpServer())
      .post('/repayments/disburse')
      .set('Authorization', `Bearer ${financeToken}`)
      .send({ repaymentIds: [principalRepaymentId, roiRepaymentId] });
    expect(disbursePrincipalRes.status).toBe(201);
    expect(disbursePrincipalRes.body.results).toEqual([
      { repaymentId: principalRepaymentId, success: true },
      { repaymentId: roiRepaymentId, success: false, error: expect.any(String) }, // already disbursed above
    ]);

    position = await request(app.getHttpServer())
      .get(`/wallets/${investorId}/position`)
      .set('Authorization', `Bearer ${financeToken}`);
    expect(position.body.availableBalance).toBe('10600.00');
    expect(position.body.investedPrincipal).toBe('0.00');

    // 5. Withdraw 3,000: request (investor) -> approve (approver, not requester) -> complete (finance).
    const withdrawalRes = await request(app.getHttpServer())
      .post('/withdrawals')
      .set('Authorization', `Bearer ${investorToken}`)
      .send({ investorId, amount: '3000', currency: 'INR' });
    expect(withdrawalRes.status).toBe(201);
    const withdrawalId = withdrawalRes.body.id;

    position = await request(app.getHttpServer())
      .get(`/wallets/${investorId}/position`)
      .set('Authorization', `Bearer ${financeToken}`);
    // Requesting a withdrawal must NOT move the available balance yet.
    expect(position.body.availableBalance).toBe('10600.00');
    expect(position.body.pendingAmount).toBe('3000.00');

    // Maker-checker: the investor who requested cannot approve their own withdrawal.
    const selfApproveRes = await request(app.getHttpServer())
      .post(`/withdrawals/${withdrawalId}/approve`)
      .set('Authorization', `Bearer ${investorToken}`);
    expect(selfApproveRes.status).toBe(403);

    const approveRes = await request(app.getHttpServer())
      .post(`/withdrawals/${withdrawalId}/approve`)
      .set('Authorization', `Bearer ${approverToken}`);
    expect(approveRes.status).toBe(201);
    expect(approveRes.body.status).toBe('APPROVED');

    const completeRes = await request(app.getHttpServer())
      .post(`/withdrawals/${withdrawalId}/complete`)
      .set('Authorization', `Bearer ${financeToken}`);
    expect(completeRes.status).toBe(201);
    expect(completeRes.body.status).toBe('COMPLETED');

    // 6. Final position must match the blueprint's worked example exactly.
    position = await request(app.getHttpServer())
      .get(`/wallets/${investorId}/position`)
      .set('Authorization', `Bearer ${financeToken}`);
    expect(position.body.availableBalance).toBe('7600.00');
    expect(position.body.investedPrincipal).toBe('0.00');
    expect(position.body.pendingAmount).toBe('0.00');
    expect(position.body.totalPosition).toBe('7600.00');
  });
});
