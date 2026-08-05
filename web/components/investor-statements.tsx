'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, Thead, Tbody, Tr, Th, Td, EmptyState } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/badge';
import { Tabs } from '@/components/ui/tabs';
import {
  useInvestments,
  useInvestorStatement,
  useRepaymentStatement,
  useRoiStatement,
  useWalletTransactions,
  useWithdrawals,
} from '@/lib/hooks';
import { formatMoney, formatDateTime } from '@/lib/format-money';

function InvestorStatementTab({ investorId }: { investorId: string }) {
  const { data, isLoading } = useInvestorStatement(investorId);
  if (isLoading) return <p className="text-sm text-gray-400">Loading…</p>;
  if (!data || data.rows.length === 0) return <EmptyState message="No posted transactions yet." />;
  return (
    <Table>
      <Thead>
        <Tr><Th>Date</Th><Th>Transaction</Th><Th>Debit</Th><Th>Credit</Th><Th>Balance</Th></Tr>
      </Thead>
      <Tbody>
        {data.rows.map((row, i) => (
          <Tr key={i}>
            <Td>{formatDateTime(row.date)}</Td>
            <Td>{row.transactionType.replace(/_/g, ' ')}</Td>
            <Td>{row.debit ? formatMoney(row.debit) : '—'}</Td>
            <Td>{row.credit ? formatMoney(row.credit) : '—'}</Td>
            <Td className="font-medium">{formatMoney(row.balance)}</Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}

function WalletStatementTab({ investorId }: { investorId: string }) {
  const { data, isLoading } = useWalletTransactions(investorId);
  if (isLoading) return <p className="text-sm text-gray-400">Loading…</p>;
  if (!data || data.length === 0) return <EmptyState message="No transactions yet." />;
  return (
    <Table>
      <Thead>
        <Tr><Th>Date</Th><Th>Type</Th><Th>Amount</Th><Th>Status</Th></Tr>
      </Thead>
      <Tbody>
        {[...data].reverse().map((tx) => (
          <Tr key={tx.id}>
            <Td>{formatDateTime(tx.createdAt)}</Td>
            <Td>{tx.transactionType.replace(/_/g, ' ')}</Td>
            <Td className={tx.direction === 'CREDIT' ? 'text-green-700' : 'text-red-600'}>
              {tx.direction === 'CREDIT' ? '+' : '-'}
              {formatMoney(tx.amount, tx.currency)}
            </Td>
            <Td><StatusBadge status={tx.status} /></Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}

function InvestmentStatementTab({ investorId }: { investorId: string }) {
  const { data, isLoading } = useInvestments(investorId);
  if (isLoading) return <p className="text-sm text-gray-400">Loading…</p>;
  if (!data || data.length === 0) return <EmptyState message="No investments yet." />;
  return (
    <Table>
      <Thead>
        <Tr><Th>Investment</Th><Th>Principal</Th><Th>Expected ROI</Th><Th>Actual ROI</Th><Th>Status</Th></Tr>
      </Thead>
      <Tbody>
        {data.map((inv) => (
          <Tr key={inv.id}>
            <Td>{inv.investmentNumber}</Td>
            <Td>{formatMoney(inv.principalAmount)}</Td>
            <Td>{inv.expectedRoi}%</Td>
            <Td>{inv.actualRoi ? `${inv.actualRoi}%` : '—'}</Td>
            <Td><StatusBadge status={inv.status} /></Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}

function RoiStatementTab({ investorId }: { investorId: string }) {
  const { data, isLoading } = useRoiStatement(investorId);
  if (isLoading) return <p className="text-sm text-gray-400">Loading…</p>;
  if (!data || data.rows.length === 0) return <EmptyState message="No ROI activity yet." />;
  return (
    <Table>
      <Thead>
        <Tr><Th>Date</Th><Th>Type</Th><Th>Investment</Th><Th>Amount</Th></Tr>
      </Thead>
      <Tbody>
        {data.rows.map((row, i) => (
          <Tr key={i}>
            <Td>{formatDateTime(row.date)}</Td>
            <Td><StatusBadge status={row.type} /></Td>
            <Td>{row.investmentNumber}</Td>
            <Td>{formatMoney(row.amount)}</Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}

function RepaymentStatementTab({ investorId }: { investorId: string }) {
  const { data, isLoading } = useRepaymentStatement(investorId);
  if (isLoading) return <p className="text-sm text-gray-400">Loading…</p>;
  if (!data || data.rows.length === 0) return <EmptyState message="No repayments yet." />;
  return (
    <Table>
      <Thead>
        <Tr><Th>Date</Th><Th>Investment</Th><Th>Principal</Th><Th>ROI</Th><Th>Other</Th><Th>Total</Th></Tr>
      </Thead>
      <Tbody>
        {data.rows.map((row, i) => (
          <Tr key={i}>
            <Td>{formatDateTime(row.date)}</Td>
            <Td>{row.investmentNumber}</Td>
            <Td>{formatMoney(row.principalAmount)}</Td>
            <Td>{formatMoney(row.roiAmount)}</Td>
            <Td>{formatMoney(row.otherAmount)}</Td>
            <Td className="font-medium">{formatMoney(row.totalAmount)}</Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}

function WithdrawalStatementTab({ investorId }: { investorId: string }) {
  const { data, isLoading } = useWithdrawals({ investorId });
  if (isLoading) return <p className="text-sm text-gray-400">Loading…</p>;
  if (!data || data.length === 0) return <EmptyState message="No withdrawal requests yet." />;
  return (
    <Table>
      <Thead>
        <Tr><Th>Reference</Th><Th>Amount</Th><Th>Requested</Th><Th>Status</Th></Tr>
      </Thead>
      <Tbody>
        {data.map((w) => (
          <Tr key={w.id}>
            <Td>{w.withdrawalNumber}</Td>
            <Td>{formatMoney(w.amount, w.currency)}</Td>
            <Td>{formatDateTime(w.requestedAt)}</Td>
            <Td><StatusBadge status={w.status} /></Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}

/** The six "Investor reports" (blueprint §31) for one investor, as tabs. */
export function InvestorStatements({ investorId }: { investorId: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Statements</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs
          tabs={[
            { key: 'investor', label: 'Investor', content: <InvestorStatementTab investorId={investorId} /> },
            { key: 'wallet', label: 'Wallet', content: <WalletStatementTab investorId={investorId} /> },
            { key: 'investment', label: 'Investment', content: <InvestmentStatementTab investorId={investorId} /> },
            { key: 'roi', label: 'ROI', content: <RoiStatementTab investorId={investorId} /> },
            { key: 'repayment', label: 'Repayment', content: <RepaymentStatementTab investorId={investorId} /> },
            { key: 'withdrawal', label: 'Withdrawal', content: <WithdrawalStatementTab investorId={investorId} /> },
          ]}
        />
      </CardContent>
    </Card>
  );
}
