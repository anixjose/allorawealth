'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

/**
 * Client-side gate only. Every real authorization check still happens
 * server-side via the API's JwtAuthGuard/RolesGuard — this just avoids
 * flashing a screen a user's role can't act on.
 *
 * `permission` mirrors the backend's RolesGuard OR-logic: a custom User
 * Category granted e.g. "REPORTS:VIEW" can reach a page even without any of
 * the fixed `roles`, additive never a substitute for them.
 */
export function RequireRole({
  roles,
  permission,
  children,
}: {
  roles?: string[];
  permission?: string;
  children: React.ReactNode;
}) {
  const { user, ready, hasRole, hasPermission } = useAuth();
  const router = useRouter();

  const allowed = (r?: string[]) => !r || r.length === 0 || hasRole(...r) || (!!permission && hasPermission(permission));

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!allowed(roles)) {
      router.replace('/');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user, roles, permission, hasRole, hasPermission, router]);

  if (!ready || !user) return null;
  if (!allowed(roles)) return null;

  return <>{children}</>;
}
