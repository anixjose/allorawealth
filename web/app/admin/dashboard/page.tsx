'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Building2, PiggyBank, ClipboardList, ChevronRight } from 'lucide-react';
import { RequireRole } from '@/components/require-role';
import { Card } from '@/components/ui/card';
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
    <Link href={href} className="group block">
      <Card className="p-6 transition-colors hover:border-royal-blue/40">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-deep/10 text-emerald-deep">
          <Icon className="h-6 w-6" />
        </div>
        <p className="mt-4 text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
        <p className="mt-2 font-serif text-3xl font-bold text-emerald-deep">{value}</p>
        {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-royal-blue opacity-0 transition-opacity group-hover:opacity-100">
          View details <ChevronRight className="h-3 w-3" />
        </span>
      </Card>
    </Link>
  );
}

function MiniStat({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <Link href={href} className="block">
      <Card className="p-5 transition-colors hover:border-royal-blue/40">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
        <p className="mt-2 text-xl font-semibold text-royal-blue">{value}</p>
      </Card>
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
    return <p className="text-sm text-gray-400">Loading…</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-emerald-deep sm:text-3xl">Overview</h1>
          <p className="mt-2 text-sm italic text-gray-500">Platform-wide position across investors, investments, and cash.</p>
        </div>
        <Link
          href="/admin/reports/management"
          className="inline-flex items-center gap-1 rounded-lg bg-emerald-deep px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-deep/90"
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

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MiniStat label="Total Investors" value={data.totalInvestors.toString()} href="/admin/investors" />
        <MiniStat label="Total Investments" value={formatMoney(data.totalInvestments)} href="/admin/reports/investment-receivables" />
        <MiniStat label="Total ROI Paid" value={formatMoney(data.totalRoiPaid)} href="/admin/reports/investor-roi" />
        <MiniStat label="Cash Position" value={formatMoney(data.cashPosition)} href="/admin/reports/cash-book" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-emerald-deep">Maturity analysis</p>
            <Link href="/admin/reports/management" className="text-xs font-medium text-royal-blue hover:text-royal-blue/80">
              View all →
            </Link>
          </div>
          {topBuckets.length === 0 ? (
            <p className="text-sm text-gray-500">No upcoming maturities.</p>
          ) : (
            <div className="space-y-3">
              {topBuckets.map((b) => (
                <Link
                  key={b.label}
                  href="/admin/reports/management"
                  className="flex items-center justify-between rounded-lg bg-white/70 p-4 shadow-sm backdrop-blur transition-colors hover:shadow-md"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{b.label}</p>
                    <p className="text-xs text-gray-500">{b.count} investment(s)</p>
                  </div>
                  <p className="text-sm font-semibold text-royal-blue">{formatMoney(b.totalPrincipal)}</p>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-emerald-deep">Recently registered investors</p>
            <Link href="/admin/investors" className="text-xs font-medium text-royal-blue hover:text-royal-blue/80">
              View all →
            </Link>
          </div>
          {recentInvestors.length === 0 ? (
            <p className="text-sm text-gray-500">No investors yet.</p>
          ) : (
            <div className="space-y-3">
              {recentInvestors.map((inv) => (
                <Link
                  key={inv.id}
                  href={`/admin/investors/${inv.id}`}
                  className="flex items-center justify-between rounded-lg bg-white/70 p-4 shadow-sm backdrop-blur transition-colors hover:shadow-md"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {inv.user.firstName} {inv.user.lastName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {inv.investorNumber} · {formatDateTime(inv.createdAt)}
                    </p>
                  </div>
                  <span className={`text-xs font-medium ${inv.status === 'ACTIVE' ? 'text-emerald-deep' : 'text-gray-400'}`}>
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
          className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-5 transition-colors hover:border-red-300"
        >
          <div>
            <p className="text-sm font-semibold text-red-700">{data.defaultedInvestments.count} defaulted investment(s)</p>
            <p className="text-xs text-red-600">Total principal at risk: {formatMoney(data.defaultedInvestments.totalPrincipal)}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-red-600" />
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
