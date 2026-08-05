'use client';

import Link from 'next/link';
import { RequireRole } from '@/components/require-role';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, Thead, Tbody, Tr, Th, Td, EmptyState } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useTrialBalance } from '@/lib/hooks';
import { formatMoney } from '@/lib/format-money';

function TrialBalanceContent() {
  const { data, isLoading } = useTrialBalance();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Trial Balance</h1>
        {data && <Badge tone={data.balanced ? 'green' : 'red'}>{data.balanced ? '✓ BALANCED' : '⚠ OUT OF BALANCE'}</Badge>}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : !data || data.rows.length === 0 ? (
            <EmptyState message="No accounts found." />
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Code</Th>
                  <Th>Account</Th>
                  <Th>Type</Th>
                  <Th>Total debit</Th>
                  <Th>Total credit</Th>
                </Tr>
              </Thead>
              <Tbody>
                {data.rows.map((row) => (
                  <Tr key={row.accountCode}>
                    <Td>
                      <Link
                        href={`/admin/reports/general-ledger?account=${row.accountCode}`}
                        className="font-medium text-brand-600 hover:text-brand-700 hover:underline"
                      >
                        {row.accountCode}
                      </Link>
                    </Td>
                    <Td>{row.accountName}</Td>
                    <Td>{row.accountType}</Td>
                    <Td>{formatMoney(row.totalDebit)}</Td>
                    <Td>{formatMoney(row.totalCredit)}</Td>
                  </Tr>
                ))}
              </Tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 font-semibold">
                  <td colSpan={3} className="py-2.5 pr-4">Total</td>
                  <td className="py-2.5 pr-4">{formatMoney(data.totalDebit)}</td>
                  <td className="py-2.5 pr-4">{formatMoney(data.totalCredit)}</td>
                </tr>
              </tfoot>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function TrialBalancePage() {
  return (
    <RequireRole roles={['FINANCE_OFFICER', 'ADMIN', 'SUPER_ADMIN']} permission="REPORTS:VIEW">
      <TrialBalanceContent />
    </RequireRole>
  );
}
