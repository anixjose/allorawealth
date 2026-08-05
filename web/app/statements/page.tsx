'use client';

import { RequireRole } from '@/components/require-role';
import { InvestorStatements } from '@/components/investor-statements';
import { useMyInvestor } from '@/lib/hooks';

function StatementsContent() {
  const { data: investor, isLoading } = useMyInvestor();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Statements</h1>
      {isLoading || !investor ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <InvestorStatements investorId={investor.id} />
      )}
    </div>
  );
}

export default function StatementsPage() {
  return (
    <RequireRole roles={['INVESTOR']}>
      <StatementsContent />
    </RequireRole>
  );
}
