'use client';

import { useParams } from 'next/navigation';
import { RequireRole } from '@/components/require-role';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, Thead, Tbody, Tr, Th, Td, EmptyState } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/badge';
import { useInvestment } from '@/lib/hooks';
import { formatMoney, formatDate } from '@/lib/format-money';

function InvestmentDetailContent() {
  const params = useParams<{ id: string }>();
  const { data: investment, isLoading } = useInvestment(params.id);

  if (isLoading || !investment) {
    return <p className="text-sm text-gray-400">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{investment.investmentNumber}</h1>
          <p className="text-sm text-gray-500">{investment.opportunity?.name}</p>
        </div>
        <StatusBadge status={investment.status} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs uppercase text-gray-500">Principal</p>
          <p className="mt-1 text-lg font-semibold">{formatMoney(investment.principalAmount)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-gray-500">Expected ROI</p>
          <p className="mt-1 text-lg font-semibold">{investment.expectedRoi}%</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-gray-500">Actual ROI</p>
          <p className="mt-1 text-lg font-semibold">{investment.actualRoi ? `${investment.actualRoi}%` : '—'}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-gray-500">Maturity</p>
          <p className="mt-1 text-lg font-semibold">{formatDate(investment.maturityDate)}</p>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Repayment schedule</CardTitle>
        </CardHeader>
        <CardContent>
          {!investment.repaymentSchedules || investment.repaymentSchedules.length === 0 ? (
            <EmptyState message="No schedule generated." />
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Due date</Th>
                  <Th>Principal due</Th>
                  <Th>ROI due</Th>
                  <Th>Total due</Th>
                  <Th>Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                {investment.repaymentSchedules.map((s) => (
                  <Tr key={s.id}>
                    <Td>{formatDate(s.dueDate)}</Td>
                    <Td>{formatMoney(s.principalDue)}</Td>
                    <Td>{formatMoney(s.roiDue)}</Td>
                    <Td>{formatMoney(s.totalDue)}</Td>
                    <Td>
                      <StatusBadge status={s.status} />
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

export default function InvestmentDetailPage() {
  return (
    <RequireRole roles={['INVESTOR']}>
      <InvestmentDetailContent />
    </RequireRole>
  );
}
