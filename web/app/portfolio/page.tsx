'use client';

import Link from 'next/link';
import { RequireRole } from '@/components/require-role';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, Thead, Tbody, Tr, Th, Td, EmptyState } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/badge';
import { useInvestments, useMyInvestor } from '@/lib/hooks';
import { formatMoney, formatDate } from '@/lib/format-money';

function PortfolioContent() {
  const { data: investor } = useMyInvestor();
  const { data: investments, isLoading } = useInvestments(investor?.id);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">My portfolio</h1>
      <Card>
        <CardHeader>
          <CardTitle>Investments</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : !investments || investments.length === 0 ? (
            <EmptyState message="No investments yet — browse the opportunities marketplace to get started." />
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Investment</Th>
                  <Th>Principal</Th>
                  <Th>Expected ROI</Th>
                  <Th>Actual ROI</Th>
                  <Th>Maturity</Th>
                  <Th>Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                {investments.map((inv) => (
                  <Tr key={inv.id}>
                    <Td>
                      <Link href={`/portfolio/${inv.id}`} className="font-medium text-brand-600 hover:text-brand-700">
                        {inv.investmentNumber}
                      </Link>
                      <p className="text-xs text-gray-400">{inv.opportunity?.name}</p>
                    </Td>
                    <Td>{formatMoney(inv.principalAmount)}</Td>
                    <Td>{inv.expectedRoi}%</Td>
                    <Td>{inv.actualRoi ? `${inv.actualRoi}%` : '—'}</Td>
                    <Td>{formatDate(inv.maturityDate)}</Td>
                    <Td>
                      <StatusBadge status={inv.status} />
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

export default function PortfolioPage() {
  return (
    <RequireRole roles={['INVESTOR']}>
      <PortfolioContent />
    </RequireRole>
  );
}
