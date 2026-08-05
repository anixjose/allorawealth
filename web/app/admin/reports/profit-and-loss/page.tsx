'use client';

import { RequireRole } from '@/components/require-role';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScheduleIIISubsection } from '@/components/schedule-iii';
import { useProfitAndLoss } from '@/lib/hooks';
import { formatMoney } from '@/lib/format-money';

function ProfitAndLossContent() {
  const { data, isLoading } = useProfitAndLoss();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Statement of Profit &amp; Loss</h1>
        <p className="mt-1 text-sm text-gray-500">Schedule III (Division I), Companies Act 2013</p>
      </div>

      {isLoading || !data ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="p-5">
              <p className="text-xs uppercase text-gray-500">Total revenue</p>
              <p className="mt-2 text-2xl font-semibold text-green-700">{formatMoney(data.totalRevenue)}</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs uppercase text-gray-500">Total expenses</p>
              <p className="mt-2 text-2xl font-semibold text-red-600">{formatMoney(data.totalExpenses)}</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs uppercase text-gray-500">Profit for the period</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">{formatMoney(data.profitForThePeriod)}</p>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>I. Revenue</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ScheduleIIISubsection number="1" title="Revenue from Operations" section={data.revenueFromOperations} />
              <ScheduleIIISubsection number="2" title="Other Income" section={data.otherIncome} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>II. Expenses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ScheduleIIISubsection number="1" title="Cost of Materials Consumed" section={data.costOfMaterialsConsumed} />
              <ScheduleIIISubsection number="2" title="Purchases of Stock-in-Trade" section={data.purchasesOfStockInTrade} />
              <ScheduleIIISubsection
                number="3"
                title="Changes in Inventories of Finished Goods, Work-in-Progress and Stock-in-Trade"
                section={data.changesInInventories}
              />
              <ScheduleIIISubsection number="4" title="Employee Benefit Expense" section={data.employeeBenefitExpense} />
              <ScheduleIIISubsection number="5" title="Finance Costs" section={data.financeCosts} />
              <ScheduleIIISubsection
                number="6"
                title="Depreciation and Amortization Expense"
                section={data.depreciationAndAmortization}
              />
              <ScheduleIIISubsection number="7" title="Other Expenses" section={data.otherExpenses} />
              <div className="flex items-center justify-between border-t border-gray-200 pt-3 text-sm font-semibold text-gray-900">
                <span>Total Expenses</span>
                <span>{formatMoney(data.totalExpenses)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-2 py-4 text-sm">
              <div className="flex items-center justify-between font-medium text-gray-800">
                <span>Profit Before Tax</span>
                <span>{formatMoney(data.profitBeforeTax)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tax Expense</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ScheduleIIISubsection number="1" title="Current Tax" section={data.currentTax} />
              <ScheduleIIISubsection number="2" title="Deferred Tax" section={data.deferredTax} />
              <div className="flex items-center justify-between border-t border-gray-200 pt-3 text-sm font-semibold text-gray-900">
                <span>Total Tax Expense</span>
                <span>{formatMoney(data.totalTax)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-2 py-4 text-sm">
              <div className="flex items-center justify-between border-t border-gray-200 pt-2 text-base font-semibold text-gray-900">
                <span>Profit for the Period</span>
                <span>{formatMoney(data.profitForThePeriod)}</span>
              </div>
              {data.totalTax === '0.00' && (
                <p className="pt-1 text-xs text-gray-400">
                  No tax has been posted to the Current Tax / Deferred Tax accounts, so Profit for the Period equals
                  Profit Before Tax.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default function ProfitAndLossPage() {
  return (
    <RequireRole roles={['FINANCE_OFFICER', 'ADMIN', 'SUPER_ADMIN']} permission="REPORTS:VIEW">
      <ProfitAndLossContent />
    </RequireRole>
  );
}
