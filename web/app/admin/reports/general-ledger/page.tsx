'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { RequireRole } from '@/components/require-role';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, Thead, Tbody, Tr, Th, Td, EmptyState } from '@/components/ui/table';
import { Select } from '@/components/ui/input';
import { useAccounts, useGeneralLedger } from '@/lib/hooks';
import { formatMoney, formatDateTime } from '@/lib/format-money';

function GeneralLedgerContent() {
  const searchParams = useSearchParams();
  const { data: accounts } = useAccounts();
  const [accountCode, setAccountCode] = useState(searchParams.get('account') ?? '');

  // Keep in sync when arriving here via a drill-down link from another report.
  useEffect(() => {
    const fromQuery = searchParams.get('account');
    if (fromQuery) setAccountCode(fromQuery);
  }, [searchParams]);

  const { data: ledger, isLoading } = useGeneralLedger(accountCode || undefined);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">General Ledger</h1>
      <Card className="max-w-sm">
        <CardContent className="pt-5">
          <Select value={accountCode} onChange={(e) => setAccountCode(e.target.value)}>
            <option value="">Select an account…</option>
            {accounts?.map((a) => (
              <option key={a.accountCode} value={a.accountCode}>
                {a.accountCode} — {a.accountName}
              </option>
            ))}
          </Select>
        </CardContent>
      </Card>

      {accountCode && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              {ledger?.account.accountCode} — {ledger?.account.accountName}
            </CardTitle>
            {ledger && <span className="text-sm font-medium text-gray-700">Ending balance: {formatMoney(ledger.endingBalance)}</span>}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : !ledger || ledger.lines.length === 0 ? (
              <EmptyState message="No posted activity on this account yet." />
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
                  {ledger.lines.map((line, i) => (
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
      )}
    </div>
  );
}

export default function GeneralLedgerPage() {
  return (
    <RequireRole roles={['FINANCE_OFFICER', 'ADMIN', 'SUPER_ADMIN']} permission="REPORTS:VIEW">
      <Suspense fallback={<p className="text-sm text-gray-400">Loading…</p>}>
        <GeneralLedgerContent />
      </Suspense>
    </RequireRole>
  );
}
