'use client';

import Link from 'next/link';
import { RequireRole } from '@/components/require-role';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const sections: { title: string; items: { href: string; label: string; description: string }[] }[] = [
  {
    title: 'Financial reports',
    items: [
      { href: '/admin/reports/trial-balance', label: 'Trial Balance', description: 'Every account, debit and credit totals — must always balance.' },
      { href: '/admin/reports/general-ledger', label: 'General Ledger', description: 'Full posted transaction detail for one account, with running balance.' },
      { href: '/admin/reports/profit-and-loss', label: 'Profit & Loss', description: 'Income less expenses for the platform.' },
      { href: '/admin/reports/balance-sheet', label: 'Balance Sheet', description: 'Assets, liabilities, and equity as of now.' },
      { href: '/admin/reports/cash-flow', label: 'Cash Flow Statement', description: 'Operating, investing, and financing cash flows (direct method).' },
      { href: '/admin/reports/cash-book', label: 'Cash / Bank', description: "The Bank account's own ledger (internal cash book — no external bank feed integrated)." },
      { href: '/admin/reports/investor-liabilities', label: 'Investor Liability Report', description: 'What the platform owes each investor: wallet, investment, and ROI payable.' },
      { href: '/admin/reports/investor-roi', label: 'Investor ROI Report', description: 'ROI accrued vs received per investor.' },
      { href: '/admin/reports/investment-receivables', label: 'Investment Receivable Report', description: 'Outstanding Investment Receivable balance per investment.' },
    ],
  },
  {
    title: 'Investor reports',
    items: [
      { href: '/admin/investors', label: 'Investor / Wallet / Investment / ROI / Repayment / Withdrawal statements', description: 'Open an investor from the directory — statements live on their detail page.' },
    ],
  },
  {
    title: 'Management reports',
    items: [
      { href: '/admin/reports/management', label: 'Management Reports', description: 'AUM, total ROI, maturity analysis, defaulted investments, pending withdrawals, cash position.' },
    ],
  },
];

function ReportsHubContent() {
  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold text-gray-900">Reports</h1>
      {sections.map((section) => (
        <div key={section.title}>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">{section.title}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {section.items.map((item) => (
              <Link key={item.href} href={item.href}>
                <Card className="h-full p-5 transition-shadow hover:shadow-md">
                  <CardHeader className="p-0">
                    <CardTitle className="text-sm">{item.label}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 pt-2">
                    <p className="text-xs text-gray-500">{item.description}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ReportsHubPage() {
  return (
    <RequireRole roles={['FINANCE_OFFICER', 'ADMIN', 'SUPER_ADMIN']} permission="REPORTS:VIEW">
      <ReportsHubContent />
    </RequireRole>
  );
}
