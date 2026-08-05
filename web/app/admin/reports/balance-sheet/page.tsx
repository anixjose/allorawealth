'use client';

import Link from 'next/link';
import { RequireRole } from '@/components/require-role';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, Thead, Tbody, Tr, Th, Td, EmptyState } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useBalanceSheet } from '@/lib/hooks';
import { formatMoney } from '@/lib/format-money';
import type { AccountBalanceRow } from '@/lib/types';

function Group({ title, rows, total }: { title: string; rows: AccountBalanceRow[]; total: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <span className="text-sm font-semibold text-gray-900">{formatMoney(total)}</span>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyState message="No accounts." />
        ) : (
          <Table>
            <Thead>
              <Tr><Th>Account</Th><Th>Balance</Th></Tr>
            </Thead>
            <Tbody>
              {rows.map((a) => (
                <Tr key={a.accountCode}>
                  <Td>
                    <Link
                      href={`/admin/reports/general-ledger?account=${a.accountCode}`}
                      className="font-medium text-brand-600 hover:text-brand-700 hover:underline"
                    >
                      {a.accountName}
                    </Link>
                  </Td>
                  <Td>{formatMoney(a.balance)}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function BalanceSheetContent() {
  const { data, isLoading } = useBalanceSheet();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Balance Sheet</h1>
        {data && <Badge tone={data.balanced ? 'green' : 'red'}>{data.balanced ? '✓ BALANCED' : '⚠ OUT OF BALANCE'}</Badge>}
      </div>
      {isLoading || !data ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <>
          <Group title="Assets" rows={data.assets} total={data.totalAssets} />
          <Group title="Liabilities" rows={data.liabilities} total={data.totalLiabilities} />
          <Group title="Equity" rows={data.equity} total={data.totalEquity} />
        </>
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
