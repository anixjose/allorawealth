'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RequireRole } from '@/components/require-role';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, Thead, Tbody, Tr, Th, Td, EmptyState } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { useReconciliations } from '@/lib/hooks';
import * as api from '@/lib/api-client';
import { formatMoney, formatDateTime } from '@/lib/format-money';
import type { Reconciliation } from '@/lib/types';

function ReconciliationItems({ id }: { id: string }) {
  const { accessToken } = useAuth();
  const { data: items, isLoading } = useQuery({
    queryKey: ['reconciliation', id, 'items'],
    queryFn: () => api.getReconciliationItems(accessToken!, id),
  });

  if (isLoading) return <p className="py-3 text-xs text-gray-400">Loading exceptions…</p>;
  if (!items || items.length === 0) {
    return <p className="py-3 text-xs text-gray-500">No exceptions — every investor balance matches the GL exactly.</p>;
  }

  return (
    <Table>
      <Thead>
        <Tr>
          <Th>Investor</Th>
          <Th>GL amount</Th>
          <Th>Sub-ledger amount</Th>
          <Th>Difference</Th>
          <Th>Type</Th>
        </Tr>
      </Thead>
      <Tbody>
        {items.map((item) => (
          <Tr key={item.id}>
            <Td>{item.investor?.investorNumber ?? item.investorId}</Td>
            <Td>{formatMoney(item.glAmount)}</Td>
            <Td>{formatMoney(item.subledgerAmount)}</Td>
            <Td className="font-medium text-red-600">{formatMoney(item.difference)}</Td>
            <Td>{item.exceptionType.replace(/_/g, ' ')}</Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}

function ReconciliationCard({ reconciliation }: { reconciliation: Reconciliation }) {
  const [expanded, setExpanded] = useState(false);
  const isReconciled = reconciliation.status === 'RECONCILED';

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">{reconciliation.account?.accountName}</h3>
        <Badge tone={isReconciled ? 'green' : 'red'}>{isReconciled ? '✓ RECONCILED' : '⚠ EXCEPTION'}</Badge>
      </div>
      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex justify-between">
          <dt className="text-gray-500">GL Balance</dt>
          <dd className="font-medium">{formatMoney(reconciliation.glBalance)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">Sub-ledger</dt>
          <dd className="font-medium">{formatMoney(reconciliation.subledgerBalance)}</dd>
        </div>
        <div className="flex justify-between border-t border-gray-100 pt-1.5">
          <dt className="text-gray-500">Difference</dt>
          <dd className={`font-medium ${isReconciled ? 'text-green-700' : 'text-red-600'}`}>
            {formatMoney(reconciliation.difference)}
          </dd>
        </div>
      </dl>
      {!isReconciled && (
        <Button variant="ghost" className="mt-3 px-0 text-xs" onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Hide exceptions' : 'View exceptions'}
        </Button>
      )}
      {expanded && <div className="mt-2">{<ReconciliationItems id={reconciliation.id} />}</div>}
    </Card>
  );
}

function ReconciliationContent() {
  const { accessToken, hasRole } = useAuth();
  const { data: reconciliations, isLoading } = useReconciliations();
  const queryClient = useQueryClient();
  const canRun = hasRole('FINANCE_OFFICER', 'ADMIN', 'SUPER_ADMIN');

  const runMutation = useMutation({
    mutationFn: () => api.runReconciliation(accessToken!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reconciliation'] }),
  });

  const latestDate = reconciliations?.[0]?.reconciliationDate;
  const latestRun = reconciliations?.filter((r) => r.reconciliationDate === latestDate) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">GL ↔ Investor sub-ledger reconciliation</h1>
          <p className="text-sm text-gray-500">
            Independently recomputes each control account from business tables and compares it to the ledger. A
            difference is always an exception — nothing here auto-corrects.
          </p>
        </div>
        {canRun && (
          <Button disabled={runMutation.isPending} onClick={() => runMutation.mutate()}>
            {runMutation.isPending ? 'Running…' : 'Run reconciliation'}
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : latestRun.length === 0 ? (
        <EmptyState message="No reconciliation runs yet. Click “Run reconciliation” to check the ledger now." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {latestRun.map((r) => (
            <ReconciliationCard key={r.id} reconciliation={r} />
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Run history</CardTitle>
        </CardHeader>
        <CardContent>
          {!reconciliations || reconciliations.length === 0 ? (
            <EmptyState message="No history yet." />
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Date</Th>
                  <Th>Account</Th>
                  <Th>Difference</Th>
                  <Th>Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                {reconciliations.map((r) => (
                  <Tr key={r.id}>
                    <Td>{formatDateTime(r.reconciliationDate)}</Td>
                    <Td>{r.account?.accountName}</Td>
                    <Td>{formatMoney(r.difference)}</Td>
                    <Td>
                      <Badge tone={r.status === 'RECONCILED' ? 'green' : 'red'}>{r.status}</Badge>
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

export default function ReconciliationPage() {
  return (
    <RequireRole roles={['FINANCE_OFFICER', 'ADMIN', 'SUPER_ADMIN']} permission="RECONCILIATION:VIEW">
      <ReconciliationContent />
    </RequireRole>
  );
}
