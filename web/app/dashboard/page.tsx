'use client';

import Link from 'next/link';
import { TrendingUp, Lightbulb } from 'lucide-react';
import { RequireRole } from '@/components/require-role';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/table';
import { useMyInvestor, useWalletPosition, useWalletTransactions } from '@/lib/hooks';
import { formatMoney, formatDateTime } from '@/lib/format-money';

/** Visual-only (bar widths, % progress) — never used for a displayed money value, so float imprecision doesn't matter here. */
function toDisplayNumber(value: string): number {
  return Number(value);
}

const STATUS_TONE: Record<string, string> = {
  POSTED: 'bg-success-bg text-emerald-deep ring-1 ring-inset ring-emerald-deep/20',
  PENDING: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20',
  REVERSED: 'bg-gray-100 text-gray-500 ring-1 ring-inset ring-gray-300',
  CANCELLED: 'bg-gray-100 text-gray-500 ring-1 ring-inset ring-gray-300',
};

function DashboardContent() {
  const { data: investor } = useMyInvestor();
  const { data: position, isLoading } = useWalletPosition(investor?.id);
  const { data: transactions } = useWalletTransactions(investor?.id);
  const recent = transactions?.slice(-5).reverse() ?? [];

  const available = position ? toDisplayNumber(position.availableBalance) : 0;
  const invested = position ? toDisplayNumber(position.investedPrincipal) : 0;
  const pending = position ? toDisplayNumber(position.pendingAmount) : 0;
  const breakdownTotal = available + invested + pending || 1;
  const expectedRoi = position ? toDisplayNumber(position.expectedRoi) : 0;
  const realisedRoi = position ? toDisplayNumber(position.realisedRoi) : 0;
  const roiProgressPct = expectedRoi > 0 ? Math.min(100, Math.round((realisedRoi / expectedRoi) * 100)) : 0;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-serif text-2xl font-bold tracking-tight text-emerald-deep sm:text-3xl">
          Welcome Back, {investor?.entityType === 'BUSINESS' ? investor.businessName : investor?.user.firstName}
        </h1>
        <p className="mt-2 text-sm italic text-gray-500">Investor {investor?.investorNumber}</p>
      </header>

      {investor?.status === 'PENDING_ACTIVATION' && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          Your account is awaiting admin approval — you can browse freely, but deposits, withdrawals, and investments
          are disabled until it&apos;s approved.
        </div>
      )}

      {isLoading || !position ? (
        <p className="text-sm text-gray-400">Loading wallet…</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-6 lg:grid-cols-12">
          {/* Hero: Total position */}
          <Card className="col-span-1 flex flex-col justify-between p-6 md:col-span-6 lg:col-span-4">
            <div>
              <span className="text-xs font-medium uppercase tracking-wider text-gray-500">Total Position</span>
              <h3 className="mt-2 font-serif text-3xl font-bold text-emerald-deep sm:text-4xl">
                {formatMoney(position.totalPosition, position.currency)}
              </h3>
            </div>
            <div className="mt-6 flex items-center gap-3">
              <span className="inline-flex items-center rounded-full bg-success-bg px-3 py-1 text-xs font-semibold text-emerald-deep ring-1 ring-inset ring-emerald-deep/20">
                Realised ROI {formatMoney(position.realisedRoi, position.currency)}
              </span>
            </div>
            <div className="mt-5 flex gap-3">
              <Link
                href="/opportunities"
                className="rounded-lg bg-emerald-deep px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-deep/90"
              >
                Invest Now
              </Link>
              <Link
                href="/withdrawals"
                className="rounded-lg border border-royal-blue/40 px-4 py-2 text-sm font-semibold text-royal-blue transition-colors hover:bg-brand-50"
              >
                Withdraw
              </Link>
            </div>
          </Card>

          {/* Position breakdown (real data, no fabricated chart) */}
          <Card className="col-span-1 flex flex-col p-6 md:col-span-6 lg:col-span-8">
            <span className="mb-6 text-xs font-medium uppercase tracking-wider text-gray-500">Position Breakdown</span>
            <div className="flex h-4 w-full overflow-hidden rounded-full bg-gray-100">
              <div className="bg-emerald-deep" style={{ width: `${(available / breakdownTotal) * 100}%` }} />
              <div className="bg-royal-blue" style={{ width: `${(invested / breakdownTotal) * 100}%` }} />
              <div className="bg-warm-gold" style={{ width: `${(pending / breakdownTotal) * 100}%` }} />
            </div>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <span className="flex items-center gap-2 text-xs font-medium text-gray-500">
                  <span className="h-2 w-2 rounded-full bg-emerald-deep" /> Available
                </span>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {formatMoney(position.availableBalance, position.currency)}
                </p>
              </div>
              <div>
                <span className="flex items-center gap-2 text-xs font-medium text-gray-500">
                  <span className="h-2 w-2 rounded-full bg-royal-blue" /> Invested
                </span>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {formatMoney(position.investedPrincipal, position.currency)}
                </p>
              </div>
              <div>
                <span className="flex items-center gap-2 text-xs font-medium text-gray-500">
                  <span className="h-2 w-2 rounded-full bg-warm-gold" /> Pending
                </span>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {formatMoney(position.pendingAmount, position.currency)}
                </p>
              </div>
            </div>
          </Card>

          {/* Recent transactions */}
          <div className="col-span-1 rounded-xl border border-gray-200 bg-gray-50 p-6 md:col-span-3 lg:col-span-4">
            <span className="mb-4 flex items-center justify-between text-xs font-medium uppercase tracking-wider text-gray-500">
              <span className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-warm-gold" /> Recent Activity
              </span>
              <Link href="/transactions" className="text-royal-blue hover:text-royal-blue/80">
                View all →
              </Link>
            </span>
            {recent.length === 0 ? (
              <EmptyState message="No transactions yet." />
            ) : (
              <div className="space-y-3">
                {recent.map((tx) => (
                  <div key={tx.id} className="rounded-lg bg-white/70 p-4 shadow-sm backdrop-blur">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-deep">
                          {tx.transactionType.replace(/_/g, ' ')}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">{formatDateTime(tx.createdAt)}</p>
                      </div>
                      <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_TONE[tx.status] ?? STATUS_TONE.CANCELLED}`}>
                        {tx.status}
                      </span>
                    </div>
                    <p className={`mt-2 text-sm font-semibold ${tx.direction === 'CREDIT' ? 'text-emerald-deep' : 'text-red-600'}`}>
                      {tx.direction === 'CREDIT' ? '+' : '-'}
                      {formatMoney(tx.amount, tx.currency)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ROI progress + Discover Opportunities CTA */}
          <div className="col-span-1 grid grid-cols-1 items-start gap-6 self-start md:col-span-3 md:grid-cols-1 lg:col-span-8 lg:grid-cols-2">
            <Card className="flex flex-col justify-center p-6">
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <span className="text-xs font-medium uppercase tracking-wider text-gray-500">ROI Progress</span>
                  <h4 className="mt-1 font-serif text-xl font-semibold text-emerald-deep">
                    {roiProgressPct >= 100 ? 'Fully Realised' : 'Accruing'}
                  </h4>
                </div>
                <span className="font-serif text-2xl font-bold text-royal-blue">{roiProgressPct}%</span>
              </div>
              <div className="mb-2 h-2 w-full rounded-full bg-gray-200">
                <div className="h-2 rounded-full bg-royal-blue" style={{ width: `${roiProgressPct}%` }} />
              </div>
              <p className="text-right text-xs text-gray-500">
                {formatMoney(position.realisedRoi, position.currency)} of {formatMoney(position.expectedRoi, position.currency)} expected
              </p>
            </Card>

            <Link
              href="/opportunities"
              className="group relative flex flex-col justify-between overflow-hidden rounded-xl bg-emerald-deep p-6 text-white shadow-lg transition-transform"
            >
              <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 blur-xl transition-all group-hover:bg-white/20" />
              <div>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <h4 className="font-serif text-xl font-semibold">Discover Opportunities</h4>
                <p className="mt-2 text-sm text-white/80">
                  Explore curated investment funds tailored to your portfolio strategy.
                </p>
              </div>
              <span className="mt-6 inline-flex w-fit items-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-emerald-deep transition-colors group-hover:bg-gray-50">
                Browse Now
              </span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <RequireRole roles={['INVESTOR']}>
      <DashboardContent />
    </RequireRole>
  );
}
