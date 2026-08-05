'use client';

import Link from 'next/link';
import { RequireRole } from '@/components/require-role';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, Thead, Tbody, Tr, Th, Td, EmptyState } from '@/components/ui/table';
import { useInvestmentReceivables } from '@/lib/hooks';
import { formatMoney } from '@/lib/format-money';

function InvestmentReceivablesContent() {
  const { data, isLoading } = useInvestmentReceivables();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Investment Receivable Report</h1>
      <p className="max-w-2xl text-sm text-gray-500">
        Outstanding balance on the Investment Receivable (1030) account, per investment — computed independently
        from the general ledger rather than the ROI schedule, as a cross-check against the Investor ROI Report.
      </p>
      <Card>
        <CardHeader>
          <CardTitle>By investment</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : !data || data.rows.length === 0 ? (
            <EmptyState message="No outstanding receivables." />
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Investment</Th>
                  <Th>Investor</Th>
                  <Th>Outstanding receivable</Th>
                </Tr>
              </Thead>
              <Tbody>
                {data.rows.map((row) => (
                  <Tr key={row.investmentId}>
                    <Td>{row.investmentNumber}</Td>
                    <Td>
                      <Link
                        href={`/admin/investors/${row.investorId}`}
                        className="font-medium text-brand-600 hover:text-brand-700 hover:underline"
                      >
                        {row.investorNumber}
                      </Link>
                    </Td>
                    <Td className="font-medium">{formatMoney(row.outstandingReceivable)}</Td>
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

export default function InvestmentReceivablesPage() {
  return (
    <RequireRole roles={['FINANCE_OFFICER', 'ADMIN', 'SUPER_ADMIN']} permission="REPORTS:VIEW">
      <InvestmentReceivablesContent />
    </RequireRole>
  );
}
