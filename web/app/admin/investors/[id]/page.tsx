'use client';

import { useParams } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RequireRole } from '@/components/require-role';
import { StatusBadge } from '@/components/ui/badge';
import { StatTile } from '@/components/ui/stat-tile';
import { Button } from '@/components/ui/button';
import { InvestorStatements } from '@/components/investor-statements';
import { useInvestor, useWalletPosition } from '@/lib/hooks';
import { useAuth } from '@/lib/auth-context';
import * as api from '@/lib/api-client';
import { formatMoney } from '@/lib/format-money';

function InvestorDetailContent() {
  const params = useParams<{ id: string }>();
  const { accessToken, hasRole } = useAuth();
  const { data: investor } = useInvestor(params.id);
  const { data: position } = useWalletPosition(params.id);
  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: () => api.approveInvestor(accessToken!, params.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investors'] });
    },
  });

  if (!investor) {
    return <p className="text-sm text-gray-400">Loading…</p>;
  }

  const canApprove = hasRole('ADMIN', 'SUPER_ADMIN', 'COMPLIANCE_OFFICER');
  const displayName =
    investor.entityType === 'BUSINESS' ? investor.businessName : `${investor.user.firstName} ${investor.user.lastName}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">
          {investor.investorNumber} — {displayName}
        </h1>
        <p className="text-sm text-gray-500">{investor.user.email}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StatusBadge status={investor.kycStatus} />
          <StatusBadge status={investor.amlStatus} />
          <StatusBadge status={investor.status} />
          {investor.status === 'PENDING_ACTIVATION' && canApprove && (
            <Button
              variant="primary"
              className="px-2 py-1 text-xs"
              disabled={approveMutation.isPending}
              onClick={() => approveMutation.mutate()}
            >
              {approveMutation.isPending ? 'Approving…' : 'Approve'}
            </Button>
          )}
        </div>
      </div>

      {position && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatTile label="Available" value={formatMoney(position.availableBalance, position.currency)} />
          <StatTile label="Invested" value={formatMoney(position.investedPrincipal, position.currency)} />
          <StatTile label="Pending" value={formatMoney(position.pendingAmount, position.currency)} />
          <StatTile label="Realised ROI" value={formatMoney(position.realisedRoi, position.currency)} />
        </div>
      )}

      <InvestorStatements investorId={params.id} />
    </div>
  );
}

export default function InvestorDetailPage() {
  return (
    <RequireRole roles={['ADMIN', 'SUPER_ADMIN', 'FINANCE_OFFICER', 'INVESTMENT_MANAGER', 'COMPLIANCE_OFFICER']} permission="INVESTORS:VIEW">
      <InvestorDetailContent />
    </RequireRole>
  );
}
