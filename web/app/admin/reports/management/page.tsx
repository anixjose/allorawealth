'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RequireRole } from '@/components/require-role';
import { StatTile } from '@/components/ui/stat-tile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, Thead, Tbody, Tr, Th, Td, EmptyState } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { FormField, Select, Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth-context';
import { useInvestments, useManagementReport } from '@/lib/hooks';
import * as api from '@/lib/api-client';
import { formatMoney, formatDateTime } from '@/lib/format-money';
import type { MaturityBucket } from '@/lib/types';

function MarkDefaultedForm() {
  const { accessToken } = useAuth();
  const { data: investments } = useInvestments();
  const queryClient = useQueryClient();
  const activeInvestments = investments?.filter((i) => i.status === 'ACTIVE') ?? [];

  const [investmentId, setInvestmentId] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => api.markInvestmentDefaulted(accessToken!, investmentId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports', 'management'] });
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      setInvestmentId('');
      setReason('');
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to mark investment as defaulted'),
  });

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Mark investment as defaulted</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-xs text-gray-500">
          Status-only — this does not post a reversing journal entry. The investment payable liability remains on
          the books until it&apos;s formally resolved.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            mutation.mutate();
          }}
          className="space-y-3"
        >
          <FormField label="Investment" htmlFor="investmentId">
            <Select id="investmentId" required value={investmentId} onChange={(e) => setInvestmentId(e.target.value)}>
              <option value="">Select an active investment…</option>
              {activeInvestments.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.investmentNumber} — {formatMoney(inv.principalAmount)}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Reason" htmlFor="reason">
            <Input id="reason" required minLength={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          </FormField>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" variant="danger" disabled={mutation.isPending} className="w-full">
            {mutation.isPending ? 'Marking…' : 'Mark as defaulted'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function MaturityBucketRow({ bucket }: { bucket: MaturityBucket }) {
  const [expanded, setExpanded] = useState(false);
  const hasInvestments = bucket.investments.length > 0;

  return (
    <>
      <Tr
        className={hasInvestments ? 'cursor-pointer' : undefined}
        onClick={() => hasInvestments && setExpanded((v) => !v)}
      >
        <Td>
          <span className="inline-flex items-center gap-1.5">
            {hasInvestments ? (
              expanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
              )
            ) : (
              <span className="inline-block w-3.5" />
            )}
            {bucket.label}
          </span>
        </Td>
        <Td>{bucket.count}</Td>
        <Td>{formatMoney(bucket.totalPrincipal)}</Td>
      </Tr>
      {expanded && hasInvestments && (
        <Tr>
          <td colSpan={3} className="bg-gray-50 px-4 py-3">
            <Table>
              <Thead>
                <Tr><Th>Investment</Th><Th>Investor</Th><Th>Principal</Th><Th>Maturity date</Th></Tr>
              </Thead>
              <Tbody>
                {bucket.investments.map((inv) => (
                  <Tr key={inv.investmentId}>
                    <Td>{inv.investmentNumber}</Td>
                    <Td>
                      <Link
                        href={`/admin/investors/${inv.investorId}`}
                        className="font-medium text-brand-600 hover:text-brand-700 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {inv.investorNumber}
                      </Link>
                    </Td>
                    <Td>{formatMoney(inv.principalAmount)}</Td>
                    <Td>{formatDateTime(inv.maturityDate)}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </td>
        </Tr>
      )}
    </>
  );
}

function ManagementReportContent() {
  const { data, isLoading } = useManagementReport();

  if (isLoading || !data) {
    return <p className="text-sm text-gray-400">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Management Reports</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatTile label="Total AUM" value={formatMoney(data.totalAUM)} />
        <StatTile label="Total investor funds" value={formatMoney(data.totalInvestorFunds)} />
        <StatTile label="Total investments" value={formatMoney(data.totalInvestments)} />
        <StatTile label="Total ROI paid" value={formatMoney(data.totalRoiPaid)} />
        <StatTile label="Total ROI accrued" value={formatMoney(data.totalRoiAccrued)} />
        <StatTile label="Cash position" value={formatMoney(data.cashPosition)} />
        <StatTile
          label="Pending withdrawals"
          value={formatMoney(data.pendingWithdrawals.amount)}
          hint={`${data.pendingWithdrawals.count} request(s)`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Maturity analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <Thead>
              <Tr><Th>Bucket</Th><Th>Count</Th><Th>Total principal</Th></Tr>
            </Thead>
            <Tbody>
              {data.maturityAnalysis.map((b) => (
                <MaturityBucketRow key={b.label} bucket={b} />
              ))}
            </Tbody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Defaulted investments ({data.defaultedInvestments.count})</CardTitle>
          </CardHeader>
          <CardContent>
            {data.defaultedInvestments.items.length === 0 ? (
              <EmptyState message="No defaulted investments." />
            ) : (
              <Table>
                <Thead>
                  <Tr><Th>Investment</Th><Th>Investor</Th><Th>Principal</Th><Th>Defaulted</Th></Tr>
                </Thead>
                <Tbody>
                  {data.defaultedInvestments.items.map((item) => (
                    <Tr key={item.investmentId}>
                      <Td>{item.investmentNumber}</Td>
                      <Td>
                        <Link
                          href={`/admin/investors/${item.investorId}`}
                          className="font-medium text-brand-600 hover:text-brand-700 hover:underline"
                        >
                          {item.investorNumber}
                        </Link>
                      </Td>
                      <Td>{formatMoney(item.principalAmount)}</Td>
                      <Td>{item.defaultedAt ? formatDateTime(item.defaultedAt) : '—'}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </CardContent>
        </Card>

        <MarkDefaultedForm />
      </div>
    </div>
  );
}

export default function ManagementReportPage() {
  return (
    <RequireRole roles={['FINANCE_OFFICER', 'ADMIN', 'SUPER_ADMIN']} permission="REPORTS:VIEW">
      <ManagementReportContent />
    </RequireRole>
  );
}
