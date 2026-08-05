'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, STAFF_ROLES } from '@/lib/auth-context';
import { LandingPage } from '@/components/landing/landing-page';

export default function HomePage() {
  const { user, ready, hasRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready || !user) return;
    router.replace(hasRole(...STAFF_ROLES) ? '/admin/dashboard' : '/dashboard');
  }, [ready, user, hasRole, router]);

  if (!ready || user) return null;

  return <LandingPage />;
}
