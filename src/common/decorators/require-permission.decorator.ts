import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'permission';

/**
 * Additive, view-only escape hatch for custom User Categories (see
 * RolesGuard) — grants access alongside the fixed @Roles() list on a route,
 * never instead of it. Only 'VIEW' exists today; write/manage delegation for
 * custom categories is a deliberate follow-on, not built here.
 */
export const RequirePermission = (module: string, action: 'VIEW' = 'VIEW') =>
  SetMetadata(PERMISSION_KEY, `${module}:${action}`);
