import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

type RoleWithFlatPermissions = Omit<Role, 'permissions'> & { permissions: string[] };

function toPermissionsJson(permissions: string[] | undefined): Prisma.InputJsonValue | undefined {
  if (!permissions) return undefined;
  return Object.fromEntries(permissions.map((key) => [key, true]));
}

function flatten(role: Role): RoleWithFlatPermissions {
  const raw = role.permissions as Record<string, boolean> | null;
  const permissions = raw ? Object.entries(raw).filter(([, granted]) => granted).map(([key]) => key) : [];
  return { ...role, permissions };
}

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<RoleWithFlatPermissions[]> {
    const roles = await this.prisma.role.findMany({ orderBy: { name: 'asc' } });
    return roles.map(flatten);
  }

  async create(dto: CreateRoleDto): Promise<RoleWithFlatPermissions> {
    try {
      const role = await this.prisma.role.create({
        data: {
          name: dto.name,
          description: dto.description,
          permissions: toPermissionsJson(dto.permissions ?? []),
        },
      });
      return flatten(role);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException(`A User Category named "${dto.name}" already exists.`);
      }
      throw err;
    }
  }

  /**
   * SUPER_ADMIN-only (enforced by RolesController) and deliberately
   * unrestricted here — Super Admin may edit or delete any category,
   * including the seven seeded ones. Caveat worth knowing: several
   * `@Roles(...)` decorators elsewhere in the codebase check the seeded
   * roles by their literal name string (e.g. 'ADMIN', 'FINANCE_OFFICER') —
   * renaming one of those Role rows changes what appears in a holder's JWT
   * `roles` claim, which would stop matching those decorators. Deleting a
   * seeded role is still blocked below while it's assigned to anyone, which
   * covers the far more common accidental case.
   */
  async updatePermissions(id: string, permissions: string[]): Promise<RoleWithFlatPermissions> {
    const existing = await this.findOrThrow(id);
    const role = await this.prisma.role.update({
      where: { id: existing.id },
      data: { permissions: toPermissionsJson(permissions) },
    });
    return flatten(role);
  }

  async update(id: string, dto: UpdateRoleDto): Promise<RoleWithFlatPermissions> {
    const existing = await this.findOrThrow(id);
    try {
      const role = await this.prisma.role.update({
        where: { id: existing.id },
        data: { name: dto.name, description: dto.description },
      });
      return flatten(role);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException(`A User Category named "${dto.name}" already exists.`);
      }
      throw err;
    }
  }

  async remove(id: string): Promise<void> {
    const existing = await this.findOrThrow(id);
    const assignedCount = await this.prisma.userRole.count({ where: { roleId: existing.id } });
    if (assignedCount > 0) {
      throw new ConflictException(
        `"${existing.name}" is still assigned to ${assignedCount} staff user(s) — reassign them before deleting this category.`,
      );
    }
    await this.prisma.role.delete({ where: { id: existing.id } });
  }

  private async findOrThrow(id: string): Promise<Role> {
    const existing = await this.prisma.role.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`User Category ${id} not found`);
    }
    return existing;
  }
}
