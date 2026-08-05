import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createTestApp, SEEDED_USERS, SEEDED_PASSWORD, uniqueEmail } from './test-app';

/**
 * Platform Admin: User Categories (custom Roles) and staff User management.
 *
 * Authorization split (per the platform owner's explicit instructions):
 *  - Add/Edit/Delete a User Category is SUPER_ADMIN-only; ADMIN can still
 *    view the list (needed to assign categories to staff).
 *  - Create/Edit/Delete a staff User, and select their category, stays
 *    ADMIN + SUPER_ADMIN — but an ADMIN can never edit their OWN category,
 *    and only SUPER_ADMIN may reactivate a disabled account.
 *  - "Delete" a staff user hard-deletes them if nothing references them yet,
 *    or falls back to disabling them (status: DISABLED) if they've already
 *    made a transaction (journal entries, approvals, etc. that must stay
 *    attributable) — Postgres tells us which case applies via a foreign-key
 *    violation on the delete attempt.
 *  - Every staff user gets a unique, sequential employeeNumber.
 */
describe('Platform Admin: User Categories + staff Users', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let adminToken: string;
  let superAdminToken: string;
  let financeToken: string;
  let investorDemoId: string;

  const login = async (email: string, password = SEEDED_PASSWORD) => {
    const res = await request(app.getHttpServer()).post('/auth/login').send({ email, password });
    expect(res.status).toBe(201);
    return res.body.accessToken as string;
  };

  beforeAll(async () => {
    app = await createTestApp();
    prisma = new PrismaClient();
    adminToken = await login(SEEDED_USERS.admin);
    superAdminToken = await login(SEEDED_USERS.superAdmin);
    financeToken = await login(SEEDED_USERS.financeOfficer);
    const investorUser = await prisma.user.findUniqueOrThrow({
      where: { email: SEEDED_USERS.investorDemo },
      include: { investor: true },
    });
    investorDemoId = investorUser.investor!.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('restricts Add/Edit/Delete of User Categories to SUPER_ADMIN, but ADMIN can still view them', async () => {
    const categoryName = `Auditor-${Date.now()}`;

    await request(app.getHttpServer())
      .post('/roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: categoryName, permissions: ['DEPOSITS:VIEW'] })
      .expect(403);

    const createRes = await request(app.getHttpServer())
      .post('/roles')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ name: categoryName, description: 'Read-only audit access', permissions: ['DEPOSITS:VIEW', 'REPORTS:VIEW'] })
      .expect(201);
    const roleId = createRes.body.id as string;

    const listRes = await request(app.getHttpServer()).get('/roles').set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(listRes.body.some((r: { id: string }) => r.id === roleId)).toBe(true);

    await request(app.getHttpServer())
      .patch(`/roles/${roleId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ description: 'Should not apply' })
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/roles/${roleId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ description: 'Updated by super admin' })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/roles/${roleId}/permissions`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ permissions: [] })
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/roles/${roleId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(403);
    await request(app.getHttpServer())
      .delete(`/roles/${roleId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(204);
  });

  it('lets Super Admin edit even a fixed seeded category, but the "still assigned" delete guard applies to every category, seeded or custom', async () => {
    const roles = (await request(app.getHttpServer()).get('/roles').set('Authorization', `Bearer ${superAdminToken}`)).body;
    const approverRole = roles.find((r: { name: string }) => r.name === 'APPROVER');
    expect(approverRole).toBeDefined();

    // Editing description (not the name, which other logged-in tokens' `roles` claims already reference by string) succeeds.
    const updateRes = await request(app.getHttpServer())
      .patch(`/roles/${approverRole.id}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ description: 'Approve sensitive transactions (edited)' })
      .expect(200);
    expect(updateRes.body.description).toBe('Approve sensitive transactions (edited)');

    // APPROVER is still assigned to the seeded approver@example.com — deletion is blocked regardless of it being a fixed role.
    await request(app.getHttpServer())
      .delete(`/roles/${approverRole.id}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(409);
  });

  it('blocks an ADMIN from editing their own Job Role / User Category, but not anyone else\'s', async () => {
    const staffList = await request(app.getHttpServer()).get('/users').set('Authorization', `Bearer ${adminToken}`).expect(200);
    const selfAdmin = staffList.body.find((u: { email: string }) => u.email === SEEDED_USERS.admin);
    const ownRoleIds = selfAdmin.userRoles.map((ur: { role: { id: string } }) => ur.role.id);

    // Editing own profile fields (not category) is fine.
    await request(app.getHttpServer())
      .patch(`/users/${selfAdmin.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ firstName: selfAdmin.firstName })
      .expect(200);

    // Editing own roleIds — even to the same value — is blocked for a plain ADMIN.
    await request(app.getHttpServer())
      .patch(`/users/${selfAdmin.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ roleIds: ownRoleIds })
      .expect(403);

    // ADMIN editing ANOTHER user's category is unaffected by the self-only guard.
    const otherEmail = uniqueEmail('other-staff');
    const otherRes = await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ firstName: 'Other', lastName: 'Staff', email: otherEmail, password: 'OtherPass123!', roleIds: ownRoleIds })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/users/${otherRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ roleIds: ownRoleIds })
      .expect(200);

    // A SUPER_ADMIN, by contrast, may edit their own category.
    const superList = await request(app.getHttpServer()).get('/users').set('Authorization', `Bearer ${superAdminToken}`);
    const selfSuperAdmin = superList.body.find((u: { email: string }) => u.email === SEEDED_USERS.superAdmin);
    const superRoleIds = selfSuperAdmin.userRoles.map((ur: { role: { id: string } }) => ur.role.id);
    await request(app.getHttpServer())
      .patch(`/users/${selfSuperAdmin.id}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ roleIds: superRoleIds })
      .expect(200);
  });

  it('assigns every staff user a unique, sequential employeeNumber', async () => {
    const roles = await request(app.getHttpServer()).get('/roles').set('Authorization', `Bearer ${adminToken}`);
    const financeRoleId = roles.body.find((r: { name: string }) => r.name === 'FINANCE_OFFICER').id;

    const first = await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ firstName: 'Emp', lastName: 'One', email: uniqueEmail('emp-one'), password: 'EmpPass123!', roleIds: [financeRoleId] })
      .expect(201);
    const second = await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ firstName: 'Emp', lastName: 'Two', email: uniqueEmail('emp-two'), password: 'EmpPass123!', roleIds: [financeRoleId] })
      .expect(201);

    expect(first.body.employeeNumber).toMatch(/^EMP-\d{6}$/);
    expect(second.body.employeeNumber).toMatch(/^EMP-\d{6}$/);
    expect(second.body.employeeNumber).not.toBe(first.body.employeeNumber);
  });

  it('hard-deletes a staff user with no transaction history, but disables (never removes) one who has made a transaction — and only Super Admin can reactivate them', async () => {
    const roles = await request(app.getHttpServer()).get('/roles').set('Authorization', `Bearer ${adminToken}`);
    const financeRoleId = roles.body.find((r: { name: string }) => r.name === 'FINANCE_OFFICER').id;

    // Case A: fresh staff user, nothing references them yet — real hard delete.
    const freshEmail = uniqueEmail('fresh-staff');
    const freshRes = await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ firstName: 'Fresh', lastName: 'Staff', email: freshEmail, password: 'FreshPass123!', roleIds: [financeRoleId] })
      .expect(201);
    const freshDeleteRes = await request(app.getHttpServer())
      .delete(`/users/${freshRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(freshDeleteRes.body.deleted).toBe(true);
    expect(freshDeleteRes.body.user).toBeNull();
    const afterFreshDelete = await request(app.getHttpServer()).get('/users').set('Authorization', `Bearer ${adminToken}`);
    expect(afterFreshDelete.body.some((u: { id: string }) => u.id === freshRes.body.id)).toBe(false);

    // Case B: staff user who has actually recorded a transaction (approving a deposit posts a
    // journal entry attributed to them) — deleting them must fall back to DISABLED, not remove the row.
    const busyEmail = uniqueEmail('busy-staff');
    const busyRes = await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ firstName: 'Busy', lastName: 'Staff', email: busyEmail, password: 'BusyPass123!', roleIds: [financeRoleId] })
      .expect(201);
    const busyToken = await login(busyEmail, 'BusyPass123!');

    const depositRes = await request(app.getHttpServer())
      .post('/deposits')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ investorId: investorDemoId, amount: '250', currency: 'INR', paymentReference: `PAY-${Date.now()}` })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/deposits/${depositRes.body.id}/approve`)
      .set('Authorization', `Bearer ${busyToken}`)
      .expect(201);

    const busyDeleteRes = await request(app.getHttpServer())
      .delete(`/users/${busyRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(busyDeleteRes.body.deleted).toBe(false);
    expect(busyDeleteRes.body.user.status).toBe('DISABLED');

    // Disabled — can no longer log in.
    await request(app.getHttpServer()).post('/auth/login').send({ email: busyEmail, password: 'BusyPass123!' }).expect(401);

    // ADMIN cannot reactivate.
    await request(app.getHttpServer())
      .patch(`/users/${busyRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ACTIVE' })
      .expect(403);

    // Only SUPER_ADMIN can.
    await request(app.getHttpServer())
      .patch(`/users/${busyRes.body.id}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ status: 'ACTIVE' })
      .expect(200);
    await request(app.getHttpServer()).post('/auth/login').send({ email: busyEmail, password: 'BusyPass123!' }).expect(201);
  });

  it('blocks an admin from deleting their own account', async () => {
    const staffList = await request(app.getHttpServer()).get('/users').set('Authorization', `Bearer ${adminToken}`);
    const selfAdmin = staffList.body.find((u: { email: string }) => u.email === SEEDED_USERS.admin);
    await request(app.getHttpServer())
      .delete(`/users/${selfAdmin.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(403);
  });

  it('rejects category management and staff management from a non-admin fixed role', async () => {
    await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${financeToken}`)
      .send({ firstName: 'Should', lastName: 'Fail', email: uniqueEmail('should-fail'), password: 'ShouldFail123!', roleIds: [] })
      .expect(403);
  });

  it('makes any change to a Super Admin user — or granting Super Admin to anyone — Super Admin only', async () => {
    const roles = await request(app.getHttpServer()).get('/roles').set('Authorization', `Bearer ${adminToken}`);
    const superAdminRoleId = roles.body.find((r: { name: string }) => r.name === 'SUPER_ADMIN').id;
    const financeRoleId = roles.body.find((r: { name: string }) => r.name === 'FINANCE_OFFICER').id;

    // An ADMIN cannot create a brand-new user with the Super Admin category.
    await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Should',
        lastName: 'NotExist',
        email: uniqueEmail('escalation-attempt'),
        password: 'ShouldFail123!',
        roleIds: [superAdminRoleId],
      })
      .expect(403);

    // Super Admin can.
    const newSuperAdminEmail = uniqueEmail('second-super-admin');
    const newSuperAdminRes = await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        firstName: 'Second',
        lastName: 'SuperAdmin',
        email: newSuperAdminEmail,
        password: 'SecondSuperPass123!',
        roleIds: [superAdminRoleId],
      })
      .expect(201);
    const newSuperAdminId = newSuperAdminRes.body.id as string;

    // An ADMIN cannot make ANY change to this Super Admin user — not even an unrelated profile edit.
    await request(app.getHttpServer())
      .patch(`/users/${newSuperAdminId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ firstName: 'Renamed' })
      .expect(403);
    await request(app.getHttpServer())
      .delete(`/users/${newSuperAdminId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(403);

    // Super Admin can edit and delete them.
    await request(app.getHttpServer())
      .patch(`/users/${newSuperAdminId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ firstName: 'Renamed' })
      .expect(200);

    // An ADMIN also cannot promote an existing, ordinary staff user up to Super Admin.
    const ordinaryEmail = uniqueEmail('ordinary-staff');
    const ordinaryRes = await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ firstName: 'Ordinary', lastName: 'Staff', email: ordinaryEmail, password: 'OrdinaryPass123!', roleIds: [financeRoleId] })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/users/${ordinaryRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ roleIds: [superAdminRoleId] })
      .expect(403);

    // Cleanup: Super Admin deletes both.
    await request(app.getHttpServer())
      .delete(`/users/${newSuperAdminId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .delete(`/users/${ordinaryRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });
});
