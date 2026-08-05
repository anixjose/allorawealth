import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { generateReferenceNumber } from '../common/reference-number';
import { CreateStaffUserDto } from './dto/create-staff-user.dto';
import { UpdateStaffUserDto } from './dto/update-staff-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmailWithRoles(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: { userRoles: { include: { role: true } } },
    });
  }

  async findByIdWithRoles(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { userRoles: { include: { role: true } } },
    });
  }

  async updatePasswordHash(userId: string, passwordHash: string) {
    return this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  }

  /**
   * Runtime equivalent of prisma/seed.ts's seedUserWithRole — creates an internal staff
   * identity with one or more User Categories and a sequential, unique employeeNumber
   * (EMP-000001) — every employee gets one, distinct from an investor's investorNumber.
   *
   * Granting the SUPER_ADMIN category itself is SUPER_ADMIN-only — an ADMIN could
   * otherwise create a brand-new user and hand them Super Admin, sidestepping the
   * "changes to a Super Admin user are Super Admin only" rule entirely.
   */
  async createStaffUser(dto: CreateStaffUserDto, actor: { roles: string[] }) {
    if (!actor.roles.includes('SUPER_ADMIN') && (await this.holdsSuperAdmin(dto.roleIds))) {
      throw new ForbiddenException('Only Super Admin can create a Super Admin user.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    try {
      const user = await this.prisma.$transaction(async (tx) => {
        const employeeNumber = await generateReferenceNumber(tx, 'EMP');
        return tx.user.create({
          data: {
            employeeNumber,
            firstName: dto.firstName,
            lastName: dto.lastName,
            email: dto.email,
            passwordHash,
            status: 'ACTIVE',
            userRoles: { create: dto.roleIds.map((roleId) => ({ roleId })) },
          },
          include: { userRoles: { include: { role: true } } },
        });
      });
      return this.omitPasswordHash(user);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('A user with this email already exists.');
      }
      throw err;
    }
  }

  /** Staff directory: users holding at least one non-INVESTOR role. */
  async findAllStaff() {
    const users = await this.prisma.user.findMany({
      include: { userRoles: { include: { role: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return users.filter(this.isStaff).map((user) => this.omitPasswordHash(user));
  }

  /**
   * Edits a staff identity's profile, email, and/or User Category assignment.
   *
   * Actor-based guards, all enforced here rather than the controller so they
   * can't be bypassed by any other caller:
   *  - Any change at all to a user who already holds SUPER_ADMIN is
   *    SUPER_ADMIN-only — an ADMIN can't touch a Super Admin's profile,
   *    category, or status even though they can touch every other staff user.
   *  - Granting SUPER_ADMIN to someone who doesn't already hold it is
   *    likewise SUPER_ADMIN-only, so an ADMIN can't escalate a plain staff
   *    user into one instead.
   *  - An ADMIN (not SUPER_ADMIN) may never change their OWN Job Role/Category
   *    — prevents self-escalation (or accidental self-demotion) by the same
   *    account that's making the edit.
   *  - Reactivating a DISABLED account (status -> ACTIVE) is SUPER_ADMIN-only;
   *    ADMIN can still edit a disabled user's other fields, just not flip them
   *    back to ACTIVE.
   */
  async updateStaffUser(id: string, dto: UpdateStaffUserDto, actor: { id: string; roles: string[] }) {
    const existing = await this.findStaffOrThrow(id);
    const actorIsSuperAdmin = actor.roles.includes('SUPER_ADMIN');
    const targetIsSuperAdmin = existing.userRoles.some((ur) => ur.role.name === 'SUPER_ADMIN');

    if (targetIsSuperAdmin && !actorIsSuperAdmin) {
      throw new ForbiddenException('Only Super Admin can make changes to a Super Admin user.');
    }
    if (dto.roleIds && !targetIsSuperAdmin && !actorIsSuperAdmin && (await this.holdsSuperAdmin(dto.roleIds))) {
      throw new ForbiddenException('Only Super Admin can grant the Super Admin category.');
    }
    if (dto.roleIds && actor.id === id && !actorIsSuperAdmin) {
      throw new ForbiddenException('You cannot edit your own Job Role / User Category.');
    }
    if (dto.status === 'ACTIVE' && existing.status !== 'ACTIVE' && !actorIsSuperAdmin) {
      throw new ForbiddenException('Only Super Admin can reactivate a disabled user.');
    }

    try {
      const user = await this.prisma.$transaction(async (tx) => {
        if (dto.roleIds) {
          await tx.userRole.deleteMany({ where: { userId: id } });
          await tx.userRole.createMany({ data: dto.roleIds.map((roleId) => ({ userId: id, roleId })) });
        }
        return tx.user.update({
          where: { id },
          data: {
            firstName: dto.firstName,
            lastName: dto.lastName,
            email: dto.email,
            status: dto.status,
          },
          include: { userRoles: { include: { role: true } } },
        });
      });
      return this.omitPasswordHash(user);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('A user with this email already exists.');
      }
      throw err;
    }
  }

  /**
   * "Deletes" a staff identity — a real hard delete if nothing else in the
   * database references them yet, or a fallback to DISABLED if they do
   * (journal entries, audit logs, approvals, disbursements, etc. must stay
   * attributable — erasing the row would either violate those foreign keys or
   * silently erase accountability). Postgres tells us which case applies: a
   * hard delete either succeeds outright or fails with a foreign-key
   * violation (P2003), so we just try it and fall back on that specific error
   * rather than manually enumerating every relation that might reference them.
   */
  async deleteStaffUser(id: string, actor: { id: string; roles: string[] }) {
    if (id === actor.id) {
      throw new ForbiddenException('You cannot delete your own account.');
    }
    const existing = await this.findStaffOrThrow(id);
    const targetIsSuperAdmin = existing.userRoles.some((ur) => ur.role.name === 'SUPER_ADMIN');
    if (targetIsSuperAdmin && !actor.roles.includes('SUPER_ADMIN')) {
      throw new ForbiddenException('Only Super Admin can delete a Super Admin user.');
    }

    try {
      await this.prisma.user.delete({ where: { id } });
      return { deleted: true, user: null };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
        const user = await this.prisma.user.update({
          where: { id },
          data: { status: 'DISABLED' },
          include: { userRoles: { include: { role: true } } },
        });
        return { deleted: false, user: this.omitPasswordHash(user) };
      }
      throw err;
    }
  }

  private async holdsSuperAdmin(roleIds: string[]): Promise<boolean> {
    if (roleIds.length === 0) return false;
    const count = await this.prisma.role.count({ where: { id: { in: roleIds }, name: 'SUPER_ADMIN' } });
    return count > 0;
  }

  private isStaff(user: { userRoles: { role: { name: string } }[] }): boolean {
    return user.userRoles.some((ur) => ur.role.name !== 'INVESTOR');
  }

  private async findStaffOrThrow(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { userRoles: { include: { role: true } } },
    });
    if (!user || !this.isStaff(user)) {
      throw new NotFoundException(`Staff user ${id} not found`);
    }
    return user;
  }

  private omitPasswordHash<T extends { passwordHash: string }>(user: T): Omit<T, 'passwordHash'> {
    const { passwordHash: _passwordHash, ...rest } = user;
    return rest;
  }
}
