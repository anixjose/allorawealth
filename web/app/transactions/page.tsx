'use client';

import { RequireRole } from '@/components/require-role';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, Thead, Tbody, Tr, Th, Td, EmptyState } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/badge';
import { useMyInvestor, useWalletTransactions } from '@/lib/hooks';
import { formatMoney, formatDateTime } from '@/lib/format-money';

function TransactionsContent() {
  const { data: investor } = useMyInvestor();
  const { data: transactions, isLoading } = useWalletTransactions(investor?.id);
  const sorted = [...(transactions ?? [])].reverse();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Wallet statement</h1>
      <Card>
        <CardHeader>
          <CardTitle>All transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : sorted.length === 0 ? (
            <EmptyState message="No transactions yet." />
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Date</Th>
                  <Th>Transaction</Th>
                  <Th>Debit</Th>
                  <Th>Credit</Th>
                  <Th>Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                {sorted.map((tx) => (
                  <Tr key={tx.id}>
                    <Td>{formatDateTime(tx.createdAt)}</Td>
                    <Td>{tx.transactionType.replace(/_/g, ' ')}</Td>
                    <Td>{tx.direction === 'DEBIT' ? formatMoney(tx.amount, tx.currency) : '—'}</Td>
                    <Td>{tx.direction === 'CREDIT' ? formatMoney(tx.amount, tx.currency) : '—'}</Td>
                    <Td>
                      <StatusBadge status={tx.status} />
                    </Td>
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

export default function TransactionsPage() {
  return (
    <RequireRole roles={['INVESTOR']}>
      <TransactionsContent />
    </RequireRole>
  );
}
