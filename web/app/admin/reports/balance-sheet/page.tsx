'use client';

import { RequireRole } from '@/components/require-role';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScheduleIIISubsection } from '@/components/schedule-iii';
import { useBalanceSheet } from '@/lib/hooks';
import { formatMoney } from '@/lib/format-money';

function BalanceSheetContent() {
  const { data, isLoading } = useBalanceSheet();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Balance Sheet</h1>
          <p className="mt-1 text-sm text-gray-500">Schedule III (Division I), Companies Act 2013 — vertical format</p>
        </div>
        {data && <Badge tone={data.balanced ? 'green' : 'red'}>{data.balanced ? '✓ BALANCED' : '⚠ OUT OF BALANCE'}</Badge>}
      </div>
      {isLoading || !data ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>I. Equity and Liabilities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ScheduleIIISubsection number="1" title="Shareholders' Funds" section={data.equityAndLiabilities.shareholdersFunds} />
              <ScheduleIIISubsection
                number="2"
                title="Share Application Money Pending Allotment"
                section={data.equityAndLiabilities.shareApplicationMoney}
              />
              <ScheduleIIISubsection number="3" title="Non-Current Liabilities" section={data.equityAndLiabilities.nonCurrentLiabilities} />
              <ScheduleIIISubsection number="4" title="Current Liabilities" section={data.equityAndLiabilities.currentLiabilities} />
              <div className="flex items-center justify-between border-t border-gray-200 pt-3 text-base font-semibold text-gray-900">
                <span>Total Equity and Liabilities</span>
                <span>{formatMoney(data.equityAndLiabilities.total)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>II. Assets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ScheduleIIISubsection number="1" title="Non-Current Assets" section={data.assets.nonCurrentAssets} />
              <ScheduleIIISubsection number="2" title="Current Assets" section={data.assets.currentAssets} />
              <div className="flex items-center justify-between border-t border-gray-200 pt-3 text-base font-semibold text-gray-900">
                <span>Total Assets</span>
                <span>{formatMoney(data.assets.total)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function BalanceSheetPage() {
  return (
    <RequireRole roles={['FINANCE_OFFICER', 'ADMIN', 'SUPER_ADMIN']} permission="REPORTS:VIEW">
      <BalanceSheetContent />
    </RequireRole>
  );
}
