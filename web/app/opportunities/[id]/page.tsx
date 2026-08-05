'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RequireRole } from '@/components/require-role';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormField, Input } from '@/components/ui/input';
import { useMyInvestor, useOpportunity, useWalletPosition } from '@/lib/hooks';
import { useAuth } from '@/lib/auth-context';
import * as api from '@/lib/api-client';
import { formatMoney, formatDate } from '@/lib/format-money';

function OpportunityDetailContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const { data: opportunity, isLoading } = useOpportunity(params.id);
  const { data: investor } = useMyInvestor();
  const { data: position } = useWalletPosition(investor?.id);

  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const isPending = investor?.status === 'PENDING_ACTIVATION';

  const investMutation = useMutation({
    mutationFn: () => api.invest(accessToken!, { investorId: investor!.id, opportunityId: params.id, amount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      setSuccess(true);
      setTimeout(() => router.push('/portfolio'), 900);
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Investment failed'),
  });

  if (isLoading || !opportunity) {
    return <p className="text-sm text-gray-400">Loading…</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{opportunity.name}</CardTitle>
            <StatusBadge status={opportunity.status} />
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">{opportunity.description}</p>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">Company</dt>
                <dd className="font-medium text-gray-900">{opportunity.company?.legalName}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Product</dt>
                <dd className="font-medium text-gray-900">{opportunity.product?.name}</dd>
              </div>
              <div>
                <dt className="text-gray-500">ROI type</dt>
                <dd className="font-medium text-gray-900">{opportunity.product?.roiType}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Expected ROI</dt>
                <dd className="font-medium text-gray-900">{opportunity.expectedRoi}%</dd>
              </div>
              <div>
                <dt className="text-gray-500">Tenure</dt>
                <dd className="font-medium text-gray-900">{opportunity.product?.tenureMonths} months</dd>
              </div>
              <div>
                <dt className="text-gray-500">Maturity date</dt>
                <dd className="font-medium text-gray-900">{formatDate(opportunity.maturityDate)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Minimum investment</dt>
                <dd className="font-medium text-gray-900">{formatMoney(opportunity.minimumInvestment)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Target amount</dt>
                <dd className="font-medium text-gray-900">{formatMoney(opportunity.targetAmount)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Invest</CardTitle>
        </CardHeader>
        <CardContent>
          {isPending && (
            <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Your account is awaiting admin approval — investing is disabled until then.
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
              investMutation.mutate();
            }}
            className="space-y-4"
          >
            <FormField label={`Amount (min. ${formatMoney(opportunity.minimumInvestment)})`} htmlFor="amount">
              <Input
                id="amount"
                type="number"
                min={opportunity.minimumInvestment}
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </FormField>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm text-green-700">Investment placed — redirecting…</p>}
            <Button
              type="submit"
              disabled={investMutation.isPending || opportunity.status !== 'OPEN' || isPending}
              className="w-full"
            >
              {investMutation.isPending ? 'Placing investment…' : 'Invest'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function OpportunityDetailPage() {
  return (
    <RequireRole roles={['INVESTOR']}>
      <OpportunityDetailContent />
    </RequireRole>
  );
}
