'use client';

import Link from 'next/link';
import { RequireRole } from '@/components/require-role';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, Thead, Tbody, Tr, Th, Td, EmptyState } from '@/components/ui/table';
import { useInvestorRoiReport } from '@/lib/hooks';
import { formatMoney } from '@/lib/format-money';

function InvestorRoiContent() {
  const { data, isLoading } = useInvestorRoiReport();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Investor ROI Report</h1>
      <Card>
        <CardHeader>
          <CardTitle>ROI accrued vs received, by investor</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : !data || data.rows.length === 0 ? (
            <EmptyState message="No ROI activity yet." />
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Investor</Th>
                  <Th>Accrued</Th>
                  <Th>Received</Th>
                  <Th>Outstanding</Th>
                </Tr>
              </Thead>
              <Tbody>
                {data.rows.map((row) => (
                  <Tr key={row.investorId}>
                    <Td>
                      <Link
                        href={`/admin/investors/${row.investorId}`}
                        className="font-medium text-brand-600 hover:text-brand-700 hover:underline"
                      >
                        {row.investorNumber}
                      </Link>
                    </Td>
                    <Td>{formatMoney(row.accrued)}</Td>
                    <Td>{formatMoney(row.received)}</Td>
                    <Td className="font-medium">{formatMoney(row.outstanding)}</Td>
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

export default function InvestorRoiPage() {
  return (
    <RequireRole roles={['FINANCE_OFFICER', 'ADMIN', 'SUPER_ADMIN']} permission="REPORTS:VIEW">
      <InvestorRoiContent />
    </RequireRole>
  );
}
