'use client';

import { RequireRole } from '@/components/require-role';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCashFlowStatement } from '@/lib/hooks';
import { formatMoney } from '@/lib/format-money';
import type { CashFlowActivity } from '@/lib/types';

function humanizeTransactionType(type: string): string {
  return type
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function ActivitySection({ number, activity }: { number: string; activity: CashFlowActivity }) {
  return (
    <div>
      <div className="flex items-center justify-between border-b border-gray-200 pb-1 text-sm font-semibold text-gray-900">
        <span>
          ({number}) {activity.label}
        </span>
        <span>{formatMoney(activity.total)}</span>
      </div>
      {activity.items.length === 0 ? (
        <p className="py-2 text-xs text-gray-400">None</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {activity.items.map((item) => (
            <div key={item.transactionType} className="flex items-center justify-between py-2 text-sm text-gray-700">
              <span>{humanizeTransactionType(item.transactionType)}</span>
              <span>{formatMoney(item.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CashFlowStatementContent() {
  const { data, isLoading } = useCashFlowStatement();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Cash Flow Statement</h1>
          <p className="mt-1 text-sm text-gray-500">
            Direct method (AS-3) — since inception, matching this platform&apos;s other financial reports.
          </p>
        </div>
        {data && <Badge tone={data.reconciled ? 'green' : 'red'}>{data.reconciled ? '✓ RECONCILED' : '⚠ NOT RECONCILED'}</Badge>}
      </div>

      {isLoading || !data ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <>
          {data.unclassifiedActivities.items.length > 0 && (
            <Card className="border-amber-300 bg-amber-50">
              <CardContent className="py-4 text-sm text-amber-800">
                <p className="font-medium">Unclassified cash activity detected</p>
                <p className="mt-1 text-xs">
                  One or more transaction types are moving cash but haven&apos;t been assigned to Operating, Investing,
                  or Financing — see &ldquo;Unclassified Activities&rdquo; below.
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Cash Flow from Activities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ActivitySection number="1" activity={data.operatingActivities} />
              <ActivitySection number="2" activity={data.investingActivities} />
              <ActivitySection number="3" activity={data.financingActivities} />
              {data.unclassifiedActivities.items.length > 0 && (
                <ActivitySection number="4" activity={data.unclassifiedActivities} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-2 py-4 text-sm">
              <div className="flex items-center justify-between font-medium text-gray-800">
                <span>Net Increase in Cash</span>
                <span>{formatMoney(data.netIncreaseInCash)}</span>
              </div>
              <div className="flex items-center justify-between text-gray-600">
                <span>Cash at the Beginning</span>
                <span>{formatMoney(data.cashAtBeginning)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-gray-200 pt-2 text-base font-semibold text-gray-900">
                <span>Cash at the End</span>
                <span>{formatMoney(data.cashAtEnd)}</span>
              </div>
              <p className="pt-1 text-xs text-gray-400">
                &ldquo;Since inception&rdquo; convention — cash at the beginning is zero, matching this app&apos;s other
                reports which show full posted history rather than a date range.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default function CashFlowStatementPage() {
  return (
    <RequireRole roles={['FINANCE_OFFICER', 'ADMIN', 'SUPER_ADMIN']} permission="REPORTS:VIEW">
      <CashFlowStatementContent />
    </RequireRole>
  );
}
