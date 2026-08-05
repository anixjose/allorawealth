'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  TrendingUp,
  Wallet,
  Receipt,
  PiggyBank,
  ArrowUpFromLine,
  FileText,
  Users,
  RefreshCw,
  Scale,
  FileBarChart,
  BookOpen,
  ShieldCheck,
  Menu,
  X,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Brand } from './brand';

const investorLinks: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/opportunities', label: 'Opportunities', icon: TrendingUp },
  { href: '/portfolio', label: 'Portfolio', icon: Wallet },
  { href: '/transactions', label: 'Transactions', icon: Receipt },
  { href: '/deposits', label: 'Deposits', icon: PiggyBank },
  { href: '/withdrawals', label: 'Withdrawals', icon: ArrowUpFromLine },
  { href: '/statements', label: 'Statements', icon: FileText },
];

const adminLinks: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/investors', label: 'Investors', icon: Users },
  { href: '/admin/deposits', label: 'Deposits', icon: PiggyBank },
  { href: '/admin/withdrawals', label: 'Withdrawals', icon: ArrowUpFromLine },
  { href: '/admin/repayments', label: 'Repayments', icon: RefreshCw },
  { href: '/admin/reconciliation', label: 'Reconciliation', icon: Scale },
  { href: '/admin/reports', label: 'Reports', icon: FileBarChart },
  { href: '/admin/catalogue', label: 'Catalogue', icon: BookOpen },
  { href: '/admin/platform', label: 'Platform Admin', icon: ShieldCheck },
];

// Auth pages own their full-screen layout — never wrap them in the app shell,
// even if a stale session means `user` is still set (e.g. visiting /login directly).
const AUTH_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password'];

function NavLink({ href, label, icon: Icon, active }: { href: string; label: string; icon: LucideIcon; active: boolean }) {
  return (
    <Link
      href={href}
      className={`group mx-2 flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
        active ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
      }`}
    >
      <Icon className="h-[18px] w-[18px] shrink-0 transition-transform group-hover:scale-110" />
      {label}
    </Link>
  );
}

export function NavShell({ children }: { children: React.ReactNode }) {
  const { user, logout, hasRole } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  if (!user || AUTH_ROUTES.includes(pathname)) return <>{children}</>;

  const isAdminSection = pathname.startsWith('/admin');
  const isStaff = hasRole('ADMIN', 'SUPER_ADMIN', 'FINANCE_OFFICER', 'APPROVER', 'INVESTMENT_MANAGER', 'COMPLIANCE_OFFICER');
  const isInvestor = hasRole('INVESTOR');
  const links = isAdminSection ? adminLinks : investorLinks;

  function handleLogout() {
    logout();
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 lg:flex">
      {/* Sidebar (desktop) */}
      <aside className="fixed left-0 top-0 z-50 hidden h-screen w-64 flex-col bg-emerald-deep py-8 shadow-xl shadow-emerald-deep/10 lg:flex">
        <div className="mb-10 px-6">
          <Brand inverse />
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-2">
          {links.map((link) => (
            <NavLink key={link.href} {...link} active={pathname === link.href} />
          ))}
        </nav>
        {isInvestor && (
          <div className="mt-6 px-6">
            <Link
              href="/opportunities"
              className="block w-full rounded-lg bg-warm-gold py-3 text-center text-sm font-semibold text-white shadow-md transition-colors hover:bg-warm-gold/90"
            >
              Invest Now
            </Link>
          </div>
        )}
        <div className="mt-6 space-y-1 border-t border-white/10 px-2 pt-4">
          {isInvestor && isStaff && (
            <button
              onClick={() => router.push(isAdminSection ? '/dashboard' : '/admin/dashboard')}
              className="mx-2 block w-[calc(100%-1rem)] rounded-lg px-4 py-2 text-left text-xs font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white"
            >
              Switch to {isAdminSection ? 'investor' : 'admin'} view
            </button>
          )}
          <Link
            href="/account/change-password"
            className="mx-2 flex items-center gap-3 rounded-lg px-4 py-2 text-sm text-white/70 transition-colors hover:bg-white/5 hover:text-white"
          >
            {user.firstName} {user.lastName}
          </Link>
          <button
            onClick={handleLogout}
            className="mx-2 flex w-[calc(100%-1rem)] items-center gap-3 rounded-lg px-4 py-2 text-sm text-white/70 transition-colors hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-[18px] w-[18px]" />
            Log out
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-h-screen flex-1 flex-col lg:ml-64">
        {/* Top bar (mobile only) */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm lg:hidden">
          <Brand />
          <button
            onClick={() => setMobileNavOpen((v) => !v)}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
            aria-label="Toggle navigation"
          >
            {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </header>
        {mobileNavOpen && (
          <nav className="border-b border-gray-200 bg-emerald-deep px-2 py-3 lg:hidden">
            <div className="space-y-1">
              {links.map((link) => (
                <NavLink key={link.href} {...link} active={pathname === link.href} />
              ))}
            </div>
            {isInvestor && (
              <Link
                href="/opportunities"
                className="mt-3 block rounded-lg bg-warm-gold px-4 py-2.5 text-center text-sm font-semibold text-white"
              >
                Invest Now
              </Link>
            )}
            <div className="mt-3 space-y-1 border-t border-white/10 pt-3">
              {isInvestor && isStaff && (
                <button
                  onClick={() => router.push(isAdminSection ? '/dashboard' : '/admin/dashboard')}
                  className="mx-2 block text-left text-xs font-medium text-white/70"
                >
                  Switch to {isAdminSection ? 'investor' : 'admin'} view
                </button>
              )}
              <Link href="/account/change-password" className="mx-2 block px-2 py-2 text-sm text-white/70">
                {user.firstName} {user.lastName}
              </Link>
              <button onClick={handleLogout} className="mx-2 flex items-center gap-2 px-2 py-2 text-sm text-white/70">
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </div>
          </nav>
        )}
        <main className="mx-auto w-full max-w-[1440px] flex-1 p-4 sm:p-6 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
