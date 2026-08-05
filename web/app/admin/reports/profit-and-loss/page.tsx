'use client';

import Link from 'next/link';
import { RequireRole } from '@/components/require-role';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, Thead, Tbody, Tr, Th, Td, EmptyState } from '@/components/ui/table';
import { useProfitAndLoss } from '@/lib/hooks';
import { formatMoney } from '@/lib/format-money';

function ProfitAndLossContent() {
  const { data, isLoading } = useProfitAndLoss();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Profit &amp; Loss</h1>
      <p className="max-w-2xl text-sm text-gray-500">
        Reads mostly zero today — the platform doesn&apos;t post any fee/management income yet in this slice, so
        there&apos;s nothing to net against expenses. Not a bug, just no fee income wired up yet.
      </p>

      {isLoading || !data ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="p-5">
              <p className="text-xs uppercase text-gray-500">Total income</p>
              <p className="mt-2 text-2xl font-semibold text-green-700">{formatMoney(data.totalIncome)}</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs uppercase text-gray-500">Total expense</p>
              <p className="mt-2 text-2xl font-semibold text-red-600">{formatMoney(data.totalExpense)}</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs uppercase text-gray-500">Net profit</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">{formatMoney(data.netProfit)}</p>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Income accounts</CardTitle>
            </CardHeader>
            <CardContent>
              {data.income.length === 0 ? (
                <EmptyState message="No income accounts." />
              ) : (
                <Table>
                  <Thead>
                    <Tr><Th>Account</Th><Th>Balance</Th></Tr>
                  </Thead>
                  <Tbody>
                    {data.income.map((a) => (
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

          <Card>
            <CardHeader>
              <CardTitle>Expense accounts</CardTitle>
            </CardHeader>
            <CardContent>
              {data.expense.length === 0 ? (
                <EmptyState message="No expense accounts." />
              ) : (
                <Table>
                  <Thead>
                    <Tr><Th>Account</Th><Th>Balance</Th></Tr>
                  </Thead>
                  <Tbody>
                    {data.expense.map((a) => (
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
        </>
      )}
    </div>
  );
}

export default function ProfitAndLossPage() {
  return (
    <RequireRole roles={['FINANCE_OFFICER', 'ADMIN', 'SUPER_ADMIN']} permission="REPORTS:VIEW">
      <ProfitAndLossContent />
    </RequireRole>
  );
}
