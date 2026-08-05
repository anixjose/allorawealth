'use client';

import Link from 'next/link';
import { Wallet, TrendingUp } from 'lucide-react';
import { RequireRole } from '@/components/require-role';
import { EmptyState } from '@/components/ui/table';
import { useMyInvestor, useWalletPosition, useWalletTransactions } from '@/lib/hooks';
import { formatMoney, formatDateTime } from '@/lib/format-money';

const STATUS_TONE: Record<string, string> = {
  POSTED: 'bg-teal-500/10 text-teal-300 ring-1 ring-inset ring-teal-400/30',
  PENDING: 'bg-amber-500/10 text-amber-300 ring-1 ring-inset ring-amber-400/30',
  REVERSED: 'bg-white/5 text-slate-400 ring-1 ring-inset ring-white/10',
  CANCELLED: 'bg-white/5 text-slate-400 ring-1 ring-inset ring-white/10',
};

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-ink-700 p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-soft">{label}</p>
      <p className="mt-2 text-xl font-semibold text-teal-300">{value}</p>
    </div>
  );
}

function DashboardContent() {
  const { data: investor } = useMyInvestor();
  const { data: position, isLoading } = useWalletPosition(investor?.id);
  const { data: transactions } = useWalletTransactions(investor?.id);
  const recent = transactions?.slice(-5).reverse() ?? [];

  return (
    <div className="-m-6 rounded-2xl bg-ink-800 p-6 text-white sm:-m-8 sm:p-8">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold">
          Welcome, {investor?.entityType === 'BUSINESS' ? investor.businessName : investor?.user.firstName}
        </h1>
        <p className="mt-1 text-sm text-slate-soft">Investor {investor?.investorNumber}</p>
      </div>

      {investor?.status === 'PENDING_ACTIVATION' && (
        <div className="mb-6 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          Your account is awaiting admin approval — you can browse freely, but deposits, withdrawals, and investments
          are disabled until it&apos;s approved.
        </div>
      )}

      {isLoading || !position ? (
        <p className="text-sm text-slate-soft">Loading wallet…</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-ink-700 p-6">
              <div className="absolute right-6 top-6 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-500/10 text-teal-300">
                <Wallet className="h-6 w-6" />
              </div>
              <p className="text-xs font-medium uppercase tracking-wide text-teal-300">Available Wallet</p>
              <p className="mt-3 text-4xl font-bold">{formatMoney(position.availableBalance, position.currency)}</p>
              <p className="mt-2 text-sm text-slate-soft">Available for withdrawal or investment</p>
              <div className="mt-5 flex gap-3">
                <Link
                  href="/opportunities"
                  className="rounded-lg bg-teal-400 px-4 py-2 text-sm font-semibold text-ink-800 transition-colors hover:bg-teal-300"
                >
                  Invest Now
                </Link>
                <Link
                  href="/withdrawals"
                  className="rounded-lg border border-teal-400/50 px-4 py-2 text-sm font-semibold text-teal-300 transition-colors hover:bg-teal-400/10"
                >
                  Withdraw
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <MiniStat label="Invested Principal" value={formatMoney(position.investedPrincipal, position.currency)} />
              <MiniStat label="Pending Amount" value={formatMoney(position.pendingAmount, position.currency)} />
              <MiniStat label="Expected ROI" value={formatMoney(position.expectedRoi, position.currency)} />
              <MiniStat label="Realised ROI" value={formatMoney(position.realisedRoi, position.currency)} />
            </div>

            <div className="flex flex-col justify-between gap-2 rounded-2xl border border-white/10 bg-ink-700 p-6 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-semibold">Total Investor Position</p>
                <p className="text-xs text-slate-soft">Available balance + invested principal</p>
              </div>
              <p className="text-2xl font-bold">{formatMoney(position.totalPosition, position.currency)}</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-ink-700 p-6">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold">Recent transactions</p>
                <Link href="/transactions" className="text-xs font-medium text-teal-300 hover:text-teal-200">
                  View all →
                </Link>
              </div>
              {recent.length === 0 ? (
                <EmptyState message="No transactions yet." />
              ) : (
                <div className="space-y-3">
                  {recent.map((tx) => (
                    <div key={tx.id} className="rounded-xl border border-white/10 bg-ink-600/40 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide">
                            {tx.transactionType.replace(/_/g, ' ')}
                          </p>
                          <p className="mt-1 text-xs text-slate-soft">{formatDateTime(tx.createdAt)}</p>
                        </div>
                        <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_TONE[tx.status] ?? STATUS_TONE.CANCELLED}`}>
                          {tx.status}
                        </span>
                      </div>
                      <p className={`mt-2 text-sm font-semibold ${tx.direction === 'CREDIT' ? 'text-teal-300' : 'text-red-300'}`}>
                        {tx.direction === 'CREDIT' ? '+' : '-'}
                        {formatMoney(tx.amount, tx.currency)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Link
              href="/opportunities"
              className="block rounded-2xl border border-white/10 bg-ink-700 p-6 transition-colors hover:border-teal-400/40"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-300">
                <TrendingUp className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold">Discover Opportunities</p>
              <p className="mt-2 text-xs text-slate-soft">
                Explore curated investment funds tailored to your portfolio strategy.
              </p>
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
