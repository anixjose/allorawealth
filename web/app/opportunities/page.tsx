'use client';

import Link from 'next/link';
import { RequireRole } from '@/components/require-role';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/table';
import { useOpportunities } from '@/lib/hooks';
import { formatMoney, formatDate } from '@/lib/format-money';

function OpportunitiesContent() {
  const { data: opportunities, isLoading } = useOpportunities();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Investment opportunities</h1>
      {isLoading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : !opportunities || opportunities.length === 0 ? (
        <EmptyState message="No opportunities available right now." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {opportunities.map((opp) => (
            <Link key={opp.id} href={`/opportunities/${opp.id}`}>
              <Card className="h-full p-5 transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between">
                  <h2 className="text-sm font-semibold text-gray-900">{opp.name}</h2>
                  <StatusBadge status={opp.status} />
                </div>
                <p className="mt-1 text-xs text-gray-500">{opp.company?.legalName}</p>
                <dl className="mt-4 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Expected ROI</dt>
                    <dd className="font-medium text-gray-900">{opp.expectedRoi}%</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Tenure</dt>
                    <dd className="font-medium text-gray-900">{opp.product?.tenureMonths} months</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Minimum investment</dt>
                    <dd className="font-medium text-gray-900">{formatMoney(opp.minimumInvestment)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Maturity</dt>
                    <dd className="font-medium text-gray-900">{formatDate(opp.maturityDate)}</dd>
                  </div>
                </dl>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OpportunitiesPage() {
  return (
    <RequireRole roles={['INVESTOR']}>
      <OpportunitiesContent />
    </RequireRole>
  );
}
