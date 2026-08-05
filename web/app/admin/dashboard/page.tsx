'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Building2, PiggyBank, ClipboardList, ChevronRight } from 'lucide-react';
import { RequireRole } from '@/components/require-role';
import { useManagementReport, useInvestorsDirectory } from '@/lib/hooks';
import { formatMoney, formatDateTime } from '@/lib/format-money';

function HeroStat({
  icon: Icon,
  label,
  value,
  hint,
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-ink-700 p-6 transition-colors hover:border-teal-400/40"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-500/10 text-teal-300">
        <Icon className="h-6 w-6" />
      </div>
      <p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-soft">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-soft">{hint}</p>}
      <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-teal-300 opacity-0 transition-opacity group-hover:opacity-100">
        View details <ChevronRight className="h-3 w-3" />
      </span>
    </Link>
  );
}

function MiniStat({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-white/10 bg-ink-700 p-5 transition-colors hover:border-teal-400/40"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-slate-soft">{label}</p>
      <p className="mt-2 text-xl font-semibold text-teal-300">{value}</p>
    </Link>
  );
}

function AdminDashboardContent() {
  const { data, isLoading } = useManagementReport();
  const { data: investors } = useInvestorsDirectory();

  const recentInvestors = [...(investors ?? [])]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);
  const topBuckets = (data?.maturityAnalysis ?? []).filter((b) => b.count > 0).slice(0, 5);

  if (isLoading || !data) {
    return (
      <div className="-m-6 rounded-2xl bg-ink-800 p-6 text-white sm:-m-8 sm:p-8">
        <p className="text-sm text-slate-soft">Loading…</p>
      </div>
    );
  }

  return (
    <div className="-m-6 rounded-2xl bg-ink-800 p-6 text-white sm:-m-8 sm:p-8">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-serif text-3xl font-bold">Overview</h1>
          <p className="mt-1 text-sm text-slate-soft">Platform-wide position across investors, investments, and cash.</p>
        </div>
        <Link
          href="/admin/reports/management"
          className="inline-flex items-center gap-1 rounded-lg bg-teal-400 px-4 py-2 text-sm font-semibold text-ink-800 transition-colors hover:bg-teal-300"
        >
          View full report <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <HeroStat icon={Building2} label="Total AUM" value={formatMoney(data.totalAUM)} href="/admin/reports/management" />
        <HeroStat
          icon={PiggyBank}
          label="Total Investor Funds"
          value={formatMoney(data.totalInvestorFunds)}
          href="/admin/reports/investor-liabilities"
        />
        <HeroStat
          icon={ClipboardList}
          label="Pending Withdrawals"
          value={formatMoney(data.pendingWithdrawals.amount)}
          hint={`${data.pendingWithdrawals.count} request(s)`}
          href="/admin/withdrawals"
        />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MiniStat label="Total Investors" value={data.totalInvestors.toString()} href="/admin/investors" />
        <MiniStat label="Total Investments" value={formatMoney(data.totalInvestments)} href="/admin/reports/investment-receivables" />
        <MiniStat label="Total ROI Paid" value={formatMoney(data.totalRoiPaid)} href="/admin/reports/investor-roi" />
        <MiniStat label="Cash Position" value={formatMoney(data.cashPosition)} href="/admin/reports/cash-book" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-ink-700 p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold">Maturity analysis</p>
            <Link href="/admin/reports/management" className="text-xs font-medium text-teal-300 hover:text-teal-200">
              View all →
            </Link>
          </div>
          {topBuckets.length === 0 ? (
            <p className="text-sm text-slate-soft">No upcoming maturities.</p>
          ) : (
            <div className="space-y-3">
              {topBuckets.map((b) => (
                <Link
                  key={b.label}
                  href="/admin/reports/management"
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-ink-600/40 p-4 transition-colors hover:border-teal-400/40"
                >
                  <div>
                    <p className="text-sm font-semibold">{b.label}</p>
                    <p className="text-xs text-slate-soft">{b.count} investment(s)</p>
                  </div>
                  <p className="text-sm font-semibold text-teal-300">{formatMoney(b.totalPrincipal)}</p>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-ink-700 p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold">Recently registered investors</p>
            <Link href="/admin/investors" className="text-xs font-medium text-teal-300 hover:text-teal-200">
              View all →
            </Link>
          </div>
          {recentInvestors.length === 0 ? (
            <p className="text-sm text-slate-soft">No investors yet.</p>
          ) : (
            <div className="space-y-3">
              {recentInvestors.map((inv) => (
                <Link
                  key={inv.id}
                  href={`/admin/investors/${inv.id}`}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-ink-600/40 p-4 transition-colors hover:border-teal-400/40"
                >
                  <div>
                    <p className="text-sm font-semibold">
                      {inv.user.firstName} {inv.user.lastName}
                    </p>
                    <p className="text-xs text-slate-soft">
                      {inv.investorNumber} · {formatDateTime(inv.createdAt)}
                    </p>
                  </div>
                  <span className={`text-xs font-medium ${inv.status === 'ACTIVE' ? 'text-teal-300' : 'text-slate-soft'}`}>
                    {inv.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {data.defaultedInvestments.count > 0 && (
        <Link
          href="/admin/reports/management"
          className="mt-6 flex items-center justify-between rounded-2xl border border-red-400/30 bg-red-500/10 p-5 transition-colors hover:border-red-400/60"
        >
          <div>
            <p className="text-sm font-semibold text-red-300">{data.defaultedInvestments.count} defaulted investment(s)</p>
            <p className="text-xs text-red-300/70">Total principal at risk: {formatMoney(data.defaultedInvestments.totalPrincipal)}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-red-300" />
        </Link>
      )}
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <RequireRole roles={['ADMIN', 'SUPER_ADMIN', 'FINANCE_OFFICER']}>
      <AdminDashboardContent />
    </RequireRole>
  );
}
