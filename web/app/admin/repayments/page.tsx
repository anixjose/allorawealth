'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RequireRole } from '@/components/require-role';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, Thead, Tbody, Tr, Th, Td, EmptyState } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormField, Input, Select } from '@/components/ui/input';
import { useInvestments, useRepayments } from '@/lib/hooks';
import { useAuth } from '@/lib/auth-context';
import * as api from '@/lib/api-client';
import { formatMoney, formatDateTime } from '@/lib/format-money';

function RecordRepaymentForm() {
  const { accessToken } = useAuth();
  const { data: investments } = useInvestments();
  const queryClient = useQueryClient();
  const activeInvestments = investments?.filter((i) => i.status === 'ACTIVE') ?? [];

  const [investmentId, setInvestmentId] = useState('');
  const [scheduleId, setScheduleId] = useState('');
  const [principalAmount, setPrincipalAmount] = useState('');
  const [roiAmount, setRoiAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedInvestment = activeInvestments.find((i) => i.id === investmentId);
  const schedules = selectedInvestment?.repaymentSchedules ?? [];
  const selectedSchedule = schedules.find((s) => s.id === scheduleId);

  const accrueMutation = useMutation({
    mutationFn: () => api.accrueRoi(accessToken!, scheduleId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['investments'] }),
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to accrue ROI'),
  });

  const recordMutation = useMutation({
    mutationFn: () =>
      api.recordRepayment(accessToken!, {
        investmentId,
        scheduleId: scheduleId || undefined,
        principalAmount: principalAmount || undefined,
        roiAmount: roiAmount || undefined,
      }),
    onSuccess: (repayment) => {
      queryClient.invalidateQueries({ queryKey: ['repayments'] });
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      setSuccess(`Recorded — awaiting disbursement to the investor's wallet.`);
      setPrincipalAmount('');
      setRoiAmount('');
      void repayment;
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to record repayment'),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Record repayment</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-xs text-gray-500">
          Records that the investment repaid this amount — it does not touch the investor&apos;s wallet yet. Use
          &quot;Disburse&quot; below once you&apos;re ready to credit it.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            setSuccess(null);
            recordMutation.mutate();
          }}
          className="space-y-3"
        >
          <FormField label="Investment" htmlFor="investmentId">
            <Select
              id="investmentId"
              required
              value={investmentId}
              onChange={(e) => {
                setInvestmentId(e.target.value);
                setScheduleId('');
              }}
            >
              <option value="">Select an active investment…</option>
              {activeInvestments.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.investmentNumber} — {formatMoney(inv.principalAmount)}
                </option>
              ))}
            </Select>
          </FormField>

          {schedules.length > 0 && (
            <FormField label="Schedule (optional)" htmlFor="scheduleId">
              <Select id="scheduleId" value={scheduleId} onChange={(e) => setScheduleId(e.target.value)}>
                <option value="">No schedule</option>
                {schedules.map((s) => (
                  <option key={s.id} value={s.id}>
                    Due {formatDateTime(s.dueDate)} — {formatMoney(s.totalDue)} ({s.status})
                    {s.roiAccruedAt ? '' : ' — ROI not accrued'}
                  </option>
                ))}
              </Select>
            </FormField>
          )}

          {selectedSchedule && !selectedSchedule.roiAccruedAt && (
            <Button
              type="button"
              variant="secondary"
              className="w-full text-xs"
              disabled={accrueMutation.isPending}
              onClick={() => accrueMutation.mutate()}
            >
              {accrueMutation.isPending ? 'Accruing…' : 'Accrue ROI for this schedule first'}
            </Button>
          )}

          <FormField label="Principal amount" htmlFor="principalAmount">
            <Input
              id="principalAmount"
              type="number"
              min="0"
              step="0.01"
              value={principalAmount}
              onChange={(e) => setPrincipalAmount(e.target.value)}
            />
          </FormField>
          <FormField label="ROI amount" htmlFor="roiAmount">
            <Input
              id="roiAmount"
              type="number"
              min="0"
              step="0.01"
              value={roiAmount}
              onChange={(e) => setRoiAmount(e.target.value)}
            />
          </FormField>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-700">{success}</p>}
          <Button type="submit" disabled={recordMutation.isPending} className="w-full">
            {recordMutation.isPending ? 'Recording…' : 'Record repayment'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function DisbursementQueue({ canManage }: { canManage: boolean }) {
  const { accessToken } = useAuth();
  const { data: repayments, isLoading } = useRepayments({ status: 'RECEIVED' });
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<Array<{ repaymentId: string; success: boolean; error?: string }> | null>(
    null,
  );

  const disburseMutation = useMutation({
    mutationFn: (repaymentIds: string[]) => api.disburseRepayments(accessToken!, repaymentIds),
    onSuccess: (res) => {
      setResults(res.results);
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ['repayments'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  const allSelected = useMemo(
    () => !!repayments && repayments.length > 0 && repayments.every((r) => selected.has(r.id)),
    [repayments, selected],
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (!repayments) return;
    setSelected(allSelected ? new Set() : new Set(repayments.map((r) => r.id)));
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Pending disbursement</CardTitle>
        {canManage && (
          <Button
            variant="primary"
            className="text-xs"
            disabled={selected.size === 0 || disburseMutation.isPending}
            onClick={() => disburseMutation.mutate(Array.from(selected))}
          >
            {disburseMutation.isPending ? 'Disbursing…' : `Disburse selected (${selected.size})`}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {results && (
          <ul className="mb-3 space-y-1 text-xs">
            {results.map((r) => (
              <li key={r.repaymentId} className={r.success ? 'text-green-700' : 'text-red-600'}>
                {r.repaymentId}: {r.success ? 'disbursed' : r.error}
              </li>
            ))}
          </ul>
        )}
        {isLoading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : !repayments || repayments.length === 0 ? (
          <EmptyState message="Nothing awaiting disbursement." />
        ) : (
          <Table>
            <Thead>
              <Tr>
                {canManage && (
                  <Th>
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                  </Th>
                )}
                <Th>Investment</Th>
                <Th>Investor</Th>
                <Th>Principal</Th>
                <Th>ROI</Th>
                <Th>Recorded</Th>
                <Th>Recorded by</Th>
                <Th>Status</Th>
              </Tr>
            </Thead>
            <Tbody>
              {repayments.map((r) => (
                <Tr key={r.id}>
                  {canManage && (
                    <Td>
                      <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} />
                    </Td>
                  )}
                  <Td>{r.investment?.investmentNumber}</Td>
                  <Td>{r.investment?.investor?.investorNumber}</Td>
                  <Td>{formatMoney(r.principalAmount)}</Td>
                  <Td>{formatMoney(r.roiAmount)}</Td>
                  <Td>{formatDateTime(r.createdAt)}</Td>
                  <Td>{r.recordedBy ? `${r.recordedBy.firstName} ${r.recordedBy.lastName}` : '—'}</Td>
                  <Td>
                    <StatusBadge status={r.status} />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function RepaymentsContent() {
  const { hasRole } = useAuth();
  const canManage = hasRole('FINANCE_OFFICER', 'ADMIN', 'SUPER_ADMIN');

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Repayments</h1>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {canManage && <RecordRepaymentForm />}
        <DisbursementQueue canManage={canManage} />
      </div>
    </div>
  );
}

export default function RepaymentsPage() {
  return (
    <RequireRole roles={['FINANCE_OFFICER', 'ADMIN', 'SUPER_ADMIN']} permission="REPAYMENTS:VIEW">
      <RepaymentsContent />
    </RequireRole>
  );
}
