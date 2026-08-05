'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from './ui/button';
import { Brand } from './brand';

const investorLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/opportunities', label: 'Opportunities' },
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/transactions', label: 'Transactions' },
  { href: '/deposits', label: 'Deposits' },
  { href: '/withdrawals', label: 'Withdrawals' },
  { href: '/statements', label: 'Statements' },
];

const adminLinks = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/investors', label: 'Investors' },
  { href: '/admin/deposits', label: 'Deposits' },
  { href: '/admin/withdrawals', label: 'Withdrawals' },
  { href: '/admin/repayments', label: 'Repayments' },
  { href: '/admin/reconciliation', label: 'Reconciliation' },
  { href: '/admin/reports', label: 'Reports' },
  { href: '/admin/catalogue', label: 'Catalogue' },
  { href: '/admin/platform', label: 'Platform Admin' },
];

// Auth pages own their full-screen layout — never wrap them in the app header,
// even if a stale session means `user` is still set (e.g. visiting /login directly).
const AUTH_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password'];

export function NavShell({ children }: { children: React.ReactNode }) {
  const { user, logout, hasRole } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  if (!user || AUTH_ROUTES.includes(pathname)) return <>{children}</>;

  const isAdminSection = pathname.startsWith('/admin');
  const isStaff = hasRole('ADMIN', 'SUPER_ADMIN', 'FINANCE_OFFICER', 'APPROVER', 'INVESTMENT_MANAGER', 'COMPLIANCE_OFFICER');
  const isInvestor = hasRole('INVESTOR');
  const links = isAdminSection ? adminLinks : investorLinks;

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <Brand />
            <nav className="flex gap-1">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                    pathname === link.href
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {isInvestor && isStaff && (
              <Button
                variant="ghost"
                className="text-xs"
                onClick={() => router.push(isAdminSection ? '/dashboard' : '/admin/dashboard')}
              >
                Switch to {isAdminSection ? 'investor' : 'admin'} view
              </Button>
            )}
            <Link
              href="/account/change-password"
              className="text-sm text-gray-500 hover:text-gray-700 hover:underline"
            >
              {user.firstName} {user.lastName}
            </Link>
            <Button
              variant="secondary"
              className="text-xs"
              onClick={() => {
                logout();
                router.push('/login');
              }}
            >
              Log out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
