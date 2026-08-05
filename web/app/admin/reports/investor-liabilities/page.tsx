'use client';

import Link from 'next/link';
import { RequireRole } from '@/components/require-role';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, Thead, Tbody, Tr, Th, Td, EmptyState } from '@/components/ui/table';
import { useInvestorLiabilities } from '@/lib/hooks';
import { formatMoney } from '@/lib/format-money';

function InvestorLiabilitiesContent() {
  const { data, isLoading } = useInvestorLiabilities();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Investor Liability Report</h1>
      <p className="max-w-2xl text-sm text-gray-500">
        What the platform currently owes each investor: wallet liability, outstanding investment principal, and
        accrued-but-unpaid ROI.
      </p>
      <Card>
        <CardHeader>
          <CardTitle>By investor</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : !data || data.rows.length === 0 ? (
            <EmptyState message="No investor balances yet." />
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Investor</Th>
                  <Th>Wallet liability</Th>
                  <Th>Investment payable</Th>
                  <Th>ROI payable</Th>
                  <Th>Total</Th>
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
                    <Td>{formatMoney(row.walletLiability)}</Td>
                    <Td>{formatMoney(row.investmentPayable)}</Td>
                    <Td>{formatMoney(row.roiPayable)}</Td>
                    <Td className="font-medium">{formatMoney(row.total)}</Td>
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

export default function InvestorLiabilitiesPage() {
  return (
    <RequireRole roles={['FINANCE_OFFICER', 'ADMIN', 'SUPER_ADMIN']} permission="REPORTS:VIEW">
      <InvestorLiabilitiesContent />
    </RequireRole>
  );
}
