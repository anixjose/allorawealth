import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Custom User Categories (Role rows outside the 7 seeded names) carry a
 * `permissions` JSON blob shaped `Record<"MODULE:VIEW", true>`. Seeded roles
 * leave this null — they're governed entirely by fixed @Roles() decorators,
 * untouched by this flattening. A user can hold multiple categories, so we
 * dedupe into one flat list carried in the JWT (same "stale until re-login"
 * characteristic the `roles` claim already has).
 */
function flattenPermissions(roles: { permissions: unknown }[]): string[] {
  const granted = new Set<string>();
  for (const role of roles) {
    const perms = role.permissions as Record<string, boolean> | null;
    if (!perms) continue;
    for (const [key, value] of Object.entries(perms)) {
      if (value) granted.add(key);
    }
  }
  return [...granted];
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmailWithRoles(email);
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const roles = user.userRoles.map((ur) => ur.role.name);
    const permissions = flattenPermissions(user.userRoles.map((ur) => ur.role));
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      roles,
      permissions,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles,
        permissions,
      },
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.usersService.findByIdWithRoles(userId);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const currentMatches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!currentMatches) {
      throw new BadRequestException('Current password is incorrect.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.usersService.updatePasswordHash(userId, passwordHash);
  }

  /**
   * No mailer is integrated in this slice (same MVP cut as the KYC/AML stub in
   * InvestorsService.register), so instead of emailing the reset link we log
   * it — a later slice swaps this for a real mail provider without touching
   * the token model. Always returns the same generic result regardless of
   * whether the email matched a user, so this endpoint can't be used to probe
   * which emails have accounts.
   */
  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmailWithRoles(email);
    if (user) {
      const rawToken = randomBytes(32).toString('hex');
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');

      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        },
      });

      const resetUrl = `${process.env.WEB_APP_URL ?? 'http://localhost:3100'}/reset-password?token=${rawToken}`;
      this.logger.log(`Password reset requested for ${email}. Reset link (no mailer configured): ${resetUrl}`);
    }

    return { message: 'If an account exists for that email, a password reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const resetToken = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      throw new BadRequestException('This reset link is invalid or has expired.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
      this.prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
    ]);
  }
}
