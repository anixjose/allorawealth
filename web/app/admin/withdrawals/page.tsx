'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RequireRole } from '@/components/require-role';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, Thead, Tbody, Tr, Th, Td, EmptyState } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { useWithdrawals } from '@/lib/hooks';
import { useAuth } from '@/lib/auth-context';
import * as api from '@/lib/api-client';
import { formatMoney, formatDateTime } from '@/lib/format-money';
import type { WithdrawalStatus } from '@/lib/types';

function WithdrawalsQueueContent() {
  const { accessToken, hasRole } = useAuth();
  const [statusFilter, setStatusFilter] = useState<WithdrawalStatus | ''>('');
  const { data: withdrawals, isLoading } = useWithdrawals(statusFilter ? { status: statusFilter } : {});
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['withdrawals'] });
    queryClient.invalidateQueries({ queryKey: ['wallet'] });
    queryClient.invalidateQueries({ queryKey: ['reports'] });
  };

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.approveWithdrawal(accessToken!, id),
    onSuccess: invalidate,
  });
  const completeMutation = useMutation({
    mutationFn: (id: string) => api.completeWithdrawal(accessToken!, id),
    onSuccess: invalidate,
  });
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => api.rejectWithdrawal(accessToken!, id, reason),
    onSuccess: invalidate,
  });

  const canApprove = hasRole('APPROVER', 'ADMIN', 'SUPER_ADMIN');
  const canComplete = hasRole('FINANCE_OFFICER', 'ADMIN', 'SUPER_ADMIN');
  const canReject = hasRole('APPROVER', 'FINANCE_OFFICER', 'ADMIN', 'SUPER_ADMIN');

  function handleReject(id: string) {
    const reason = window.prompt('Reason for rejection:');
    if (reason && reason.trim().length >= 3) {
      rejectMutation.mutate({ id, reason: reason.trim() });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Withdrawal queue</h1>
        <Select
          className="w-56"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as WithdrawalStatus | '')}
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="UNDER_REVIEW">Under review</option>
          <option value="APPROVED">Approved</option>
          <option value="COMPLETED">Completed</option>
          <option value="REJECTED">Rejected</option>
          <option value="CANCELLED">Cancelled</option>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : !withdrawals || withdrawals.length === 0 ? (
            <EmptyState message="No withdrawal requests." />
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Reference</Th>
                  <Th>Amount</Th>
                  <Th>Requested</Th>
                  <Th>Status</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {withdrawals.map((w) => (
                  <Tr key={w.id}>
                    <Td>{w.withdrawalNumber}</Td>
                    <Td>{formatMoney(w.amount, w.currency)}</Td>
                    <Td>{formatDateTime(w.requestedAt)}</Td>
                    <Td>
                      <StatusBadge status={w.status} />
                    </Td>
                    <Td>
                      <div className="flex gap-2">
                        {(w.status === 'PENDING' || w.status === 'UNDER_REVIEW') && canApprove && (
                          <Button
                            variant="secondary"
                            className="px-2 py-1 text-xs"
                            disabled={approveMutation.isPending}
                            onClick={() => approveMutation.mutate(w.id)}
                          >
                            Approve
                          </Button>
                        )}
                        {w.status === 'APPROVED' && canComplete && (
                          <Button
                            variant="primary"
                            className="px-2 py-1 text-xs"
                            disabled={completeMutation.isPending}
                            onClick={() => completeMutation.mutate(w.id)}
                          >
                            Complete
                          </Button>
                        )}
                        {['PENDING', 'UNDER_REVIEW', 'APPROVED'].includes(w.status) && canReject && (
                          <Button
                            variant="danger"
                            className="px-2 py-1 text-xs"
                            disabled={rejectMutation.isPending}
                            onClick={() => handleReject(w.id)}
                          >
                            Reject
                          </Button>
                        )}
                      </div>
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

export default function WithdrawalsQueuePage() {
  return (
    <RequireRole roles={['FINANCE_OFFICER', 'APPROVER', 'ADMIN', 'SUPER_ADMIN']} permission="WITHDRAWALS:VIEW">
      <WithdrawalsQueueContent />
    </RequireRole>
  );
}
