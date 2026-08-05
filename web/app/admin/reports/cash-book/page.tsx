'use client';

import Link from 'next/link';
import { RequireRole } from '@/components/require-role';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, Thead, Tbody, Tr, Th, Td, EmptyState } from '@/components/ui/table';
import { useCashBook } from '@/lib/hooks';
import { formatMoney, formatDateTime } from '@/lib/format-money';

function CashBookContent() {
  const { data, isLoading } = useCashBook();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Cash / Bank</h1>
      <p className="max-w-2xl text-sm text-gray-500">
        The Bank account&apos;s own posted ledger — an internal cash book. There&apos;s no external bank feed
        integrated in this slice, so this isn&apos;t a reconciliation against an actual bank statement, just what
        the ledger says cash should be.
      </p>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{data?.account.accountName ?? 'Bank Account'}</CardTitle>
          {data && <span className="text-sm font-medium text-gray-700">Ending balance: {formatMoney(data.endingBalance)}</span>}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : !data || data.lines.length === 0 ? (
            <EmptyState message="No posted cash activity yet." />
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Date</Th>
                  <Th>Journal</Th>
                  <Th>Description</Th>
                  <Th>Investor</Th>
                  <Th>Debit</Th>
                  <Th>Credit</Th>
                  <Th>Running balance</Th>
                </Tr>
              </Thead>
              <Tbody>
                {data.lines.map((line, i) => (
                  <Tr key={i}>
                    <Td>{formatDateTime(line.date)}</Td>
                    <Td>{line.journalNumber}</Td>
                    <Td>{line.description ?? line.transactionType}</Td>
                    <Td>
                      {line.investorId ? (
                        <Link
                          href={`/admin/investors/${line.investorId}`}
                          className="font-medium text-brand-600 hover:text-brand-700 hover:underline"
                        >
                          {line.investorNumber}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </Td>
                    <Td>{line.debit !== '0.00' ? formatMoney(line.debit) : '—'}</Td>
                    <Td>{line.credit !== '0.00' ? formatMoney(line.credit) : '—'}</Td>
                    <Td className="font-medium">{formatMoney(line.runningBalance)}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function CashBookPage() {
  return (
    <RequireRole roles={['FINANCE_OFFICER', 'ADMIN', 'SUPER_ADMIN']} permission="REPORTS:VIEW">
      <CashBookContent />
    </RequireRole>
  );
}
