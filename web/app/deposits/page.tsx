'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RequireRole } from '@/components/require-role';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, Thead, Tbody, Tr, Th, Td, EmptyState } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormField, Input } from '@/components/ui/input';
import { useDeposits, useMyInvestor, useWalletPosition } from '@/lib/hooks';
import { useAuth } from '@/lib/auth-context';
import * as api from '@/lib/api-client';
import { formatMoney, formatDateTime } from '@/lib/format-money';

function DepositsContent() {
  const { accessToken } = useAuth();
  const { data: investor } = useMyInvestor();
  const { data: position } = useWalletPosition(investor?.id);
  const { data: deposits, isLoading } = useDeposits({ investorId: investor?.id });
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [error, setError] = useState<string | null>(null);
  const isPending = investor?.status === 'PENDING_ACTIVATION';

  const requestMutation = useMutation({
    mutationFn: () =>
      api.requestDeposit(accessToken!, {
        investorId: investor!.id,
        amount,
        currency: position?.currency ?? 'INR',
        paymentReference,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deposits'] });
      setAmount('');
      setPaymentReference('');
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Deposit request failed'),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Deposits</h1>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Request a deposit</CardTitle>
        </CardHeader>
        <CardContent>
          {isPending && (
            <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Your account is awaiting admin approval — deposits are disabled until then.
            </p>
          )}
          <p className="mb-3 text-xs text-gray-500">
            Tell us about a transfer you&apos;ve made — it&apos;ll be credited to your wallet once an admin verifies
            it.
          </p>
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
            <FormField label="Payment reference" htmlFor="paymentReference">
              <Input
                id="paymentReference"
                required
                placeholder="e.g. bank transaction ID"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
              />
            </FormField>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={requestMutation.isPending || isPending} className="w-full">
              {requestMutation.isPending ? 'Requesting…' : 'Request deposit'}
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
          ) : !deposits || deposits.length === 0 ? (
            <EmptyState message="No deposit requests yet." />
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
                {deposits.map((d) => (
                  <Tr key={d.id}>
                    <Td>{d.depositNumber}</Td>
                    <Td>{formatMoney(d.amount, d.currency)}</Td>
                    <Td>{formatDateTime(d.requestedAt)}</Td>
                    <Td>
                      <StatusBadge status={d.status} />
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

export default function DepositsPage() {
  return (
    <RequireRole roles={['INVESTOR']}>
      <DepositsContent />
    </RequireRole>
  );
}
