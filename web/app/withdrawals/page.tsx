'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RequireRole } from '@/components/require-role';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, Thead, Tbody, Tr, Th, Td, EmptyState } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormField, Input } from '@/components/ui/input';
import { useMyInvestor, useWalletPosition, useWithdrawals } from '@/lib/hooks';
import { useAuth } from '@/lib/auth-context';
import * as api from '@/lib/api-client';
import { formatMoney, formatDateTime } from '@/lib/format-money';

function WithdrawalsContent() {
  const { accessToken } = useAuth();
  const { data: investor } = useMyInvestor();
  const { data: position } = useWalletPosition(investor?.id);
  const { data: withdrawals, isLoading } = useWithdrawals({ investorId: investor?.id });
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const isPending = investor?.status === 'PENDING_ACTIVATION';

  const requestMutation = useMutation({
    mutationFn: () =>
      api.requestWithdrawal(accessToken!, {
        investorId: investor!.id,
        amount,
        currency: position?.currency ?? 'INR',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      setAmount('');
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Withdrawal request failed'),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Withdrawals</h1>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Request a withdrawal</CardTitle>
        </CardHeader>
        <CardContent>
          {isPending && (
            <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Your account is awaiting admin approval — withdrawals are disabled until then.
            </p>
          )}
          {position && (
            <p className="mb-3 text-xs text-gray-500">
              Available balance: <span className="font-medium text-gray-800">{formatMoney(position.availableBalance)}</span>
            </p>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              requestMutation.mutate();
            }}
            className="space-y-4"
          >
            <FormField label="Amount" htmlFor="amount">
              <Input
                id="amount"
                type="number"
                min="0.01"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </FormField>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={requestMutation.isPending || isPending} className="w-full">
              {requestMutation.isPending ? 'Requesting…' : 'Request withdrawal'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Request history</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : !withdrawals || withdrawals.length === 0 ? (
            <EmptyState message="No withdrawal requests yet." />
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Reference</Th>
                  <Th>Amount</Th>
                  <Th>Requested</Th>
                  <Th>Status</Th>
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

export default function WithdrawalsPage() {
  return (
    <RequireRole roles={['INVESTOR']}>
      <WithdrawalsContent />
    </RequireRole>
  );
}
