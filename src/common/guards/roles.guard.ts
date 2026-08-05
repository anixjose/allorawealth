import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { AuthenticatedUser } from '../decorators/current-user.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.user;
    if (!user) {
      throw new ForbiddenException('No authenticated user on request');
    }

    if (requiredRoles.some((role) => user.roles.includes(role))) {
      return true;
    }

    // Additive escape hatch: a custom User Category (not one of the fixed
    // seeded roles above) can still pass if it's been granted the matching
    // module:VIEW permission via @RequirePermission on this route.
    const requiredPermission = this.reflector.getAllAndOverride<string | undefined>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (requiredPermission && user.permissions.includes(requiredPermission)) {
      return true;
    }

    throw new ForbiddenException(`Requires one of roles: ${requiredRoles.join(', ')}`);
  }
}
