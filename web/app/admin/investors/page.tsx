'use client';

import Link from 'next/link';
import { RequireRole } from '@/components/require-role';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, Thead, Tbody, Tr, Th, Td, EmptyState } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/badge';
import { useInvestorsDirectory } from '@/lib/hooks';

function InvestorsDirectoryContent() {
  const { data: investors, isLoading } = useInvestorsDirectory();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Investors</h1>
      <Card>
        <CardHeader>
          <CardTitle>Directory</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : !investors || investors.length === 0 ? (
            <EmptyState message="No investors yet." />
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Investor</Th>
                  <Th>Entity</Th>
                  <Th>Email</Th>
                  <Th>Wallet</Th>
                  <Th>KYC</Th>
                  <Th>AML</Th>
                  <Th>Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                {investors.map((inv) => (
                  <Tr key={inv.id}>
                    <Td>
                      <Link
                        href={`/admin/investors/${inv.id}`}
                        className="font-medium text-brand-600 hover:text-brand-700"
                      >
                        {inv.investorNumber}
                      </Link>
                      <p className="text-xs text-gray-400">
                        {inv.entityType === 'BUSINESS' ? inv.businessName : `${inv.user.firstName} ${inv.user.lastName}`}
                      </p>
                    </Td>
                    <Td>
                      <span className="text-xs text-gray-500">
                        {inv.entityType === 'BUSINESS' ? 'Business' : 'Individual'}
                      </span>
                    </Td>
                    <Td>{inv.user.email}</Td>
                    <Td>{inv.wallet?.walletNumber ?? '—'}</Td>
                    <Td>
                      <StatusBadge status={inv.kycStatus} />
                    </Td>
                    <Td>
                      <StatusBadge status={inv.amlStatus} />
                    </Td>
                    <Td>
                      <StatusBadge status={inv.status} />
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

export default function InvestorsDirectoryPage() {
  return (
    <RequireRole roles={['ADMIN', 'SUPER_ADMIN', 'FINANCE_OFFICER', 'COMPLIANCE_OFFICER', 'INVESTMENT_MANAGER']} permission="INVESTORS:VIEW">
      <InvestorsDirectoryContent />
    </RequireRole>
  );
}
