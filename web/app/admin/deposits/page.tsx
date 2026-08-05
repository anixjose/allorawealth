'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RequireRole } from '@/components/require-role';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, Thead, Tbody, Tr, Th, Td, EmptyState } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { useDeposits } from '@/lib/hooks';
import { useAuth } from '@/lib/auth-context';
import * as api from '@/lib/api-client';
import { formatMoney, formatDateTime } from '@/lib/format-money';
import type { DepositStatus } from '@/lib/types';

function DepositsQueueContent() {
  const { accessToken, hasRole } = useAuth();
  const [statusFilter, setStatusFilter] = useState<DepositStatus | ''>('');
  const { data: deposits, isLoading } = useDeposits(statusFilter ? { status: statusFilter } : {});
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['deposits'] });
    queryClient.invalidateQueries({ queryKey: ['wallet'] });
    queryClient.invalidateQueries({ queryKey: ['reports'] });
  };

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.approveDeposit(accessToken!, id),
    onSuccess: invalidate,
  });
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => api.rejectDeposit(accessToken!, id, reason),
    onSuccess: invalidate,
  });

  const canDecide = hasRole('FINANCE_OFFICER', 'ADMIN', 'SUPER_ADMIN');

  function handleReject(id: string) {
    const reason = window.prompt('Reason for rejection:');
    if (reason && reason.trim().length >= 3) {
      rejectMutation.mutate({ id, reason: reason.trim() });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Deposit queue</h1>
        <Select
          className="w-56"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as DepositStatus | '')}
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </Select>
      </div>
      <p className="max-w-2xl text-sm text-gray-500">
        Approving credits the investor&apos;s wallet and posts the ledger journal immediately — there&apos;s no
        separate completion step, since approval itself is the confirmation that the transfer happened. Rejecting
        never touches the ledger.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : !deposits || deposits.length === 0 ? (
            <EmptyState message="No deposit requests." />
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Reference</Th>
                  <Th>Amount</Th>
                  <Th>Payment reference</Th>
                  <Th>Requested</Th>
                  <Th>Status</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {deposits.map((d) => (
                  <Tr key={d.id}>
                    <Td>{d.depositNumber}</Td>
                    <Td>{formatMoney(d.amount, d.currency)}</Td>
                    <Td>{d.paymentReference}</Td>
                    <Td>{formatDateTime(d.requestedAt)}</Td>
                    <Td>
                      <StatusBadge status={d.status} />
                    </Td>
                    <Td>
                      {d.status === 'PENDING' && canDecide && (
                        <div className="flex gap-2">
                          <Button
                            variant="primary"
                            className="px-2 py-1 text-xs"
                            disabled={approveMutation.isPending}
                            onClick={() => approveMutation.mutate(d.id)}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="danger"
                            className="px-2 py-1 text-xs"
                            disabled={rejectMutation.isPending}
                            onClick={() => handleReject(d.id)}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
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

export default function DepositsQueuePage() {
  return (
    <RequireRole roles={['FINANCE_OFFICER', 'ADMIN', 'SUPER_ADMIN']} permission="DEPOSITS:VIEW">
      <DepositsQueueContent />
    </RequireRole>
  );
}
