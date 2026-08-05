import { AccountType, ScheduleIIIGroup } from '@prisma/client';

/**
 * Schedule III (Division I), Companies Act 2013 — the full set of sub-heads a given
 * AccountType may be classified into, shown regardless of whether any account/balance
 * exists for a given head. Excludes only concepts this ledger has no underlying data model
 * for at all: Exceptional/Extraordinary items, discontinued operations, and Earnings Per
 * Share (which requires a share-count/face-value model this system doesn't have).
 */
export const SCHEDULE_III_GROUPS_BY_ACCOUNT_TYPE: Record<AccountType, ScheduleIIIGroup[]> = {
  EQUITY: ['SHARE_CAPITAL', 'RESERVES_AND_SURPLUS', 'SHARE_APPLICATION_MONEY'],
  LIABILITY: [
    'LONG_TERM_BORROWINGS',
    'DEFERRED_TAX_LIABILITIES',
    'OTHER_LONG_TERM_LIABILITIES',
    'LONG_TERM_PROVISIONS',
    'SHORT_TERM_BORROWINGS',
    'TRADE_PAYABLES',
    'OTHER_CURRENT_LIABILITIES',
    'SHORT_TERM_PROVISIONS',
  ],
  ASSET: [
    'TANGIBLE_ASSETS',
    'INTANGIBLE_ASSETS',
    'CAPITAL_WORK_IN_PROGRESS',
    'INTANGIBLE_ASSETS_UNDER_DEVELOPMENT',
    'NON_CURRENT_INVESTMENTS',
    'DEFERRED_TAX_ASSETS',
    'LONG_TERM_LOANS_AND_ADVANCES',
    'OTHER_NON_CURRENT_ASSETS',
    'CURRENT_INVESTMENTS',
    'INVENTORIES',
    'TRADE_RECEIVABLES',
    'CASH_AND_CASH_EQUIVALENTS',
    'SHORT_TERM_LOANS_AND_ADVANCES',
    'OTHER_CURRENT_ASSETS',
  ],
  INCOME: ['REVENUE_FROM_OPERATIONS', 'OTHER_INCOME'],
  EXPENSE: [
    'COST_OF_MATERIALS_CONSUMED',
    'PURCHASES_OF_STOCK_IN_TRADE',
    'CHANGES_IN_INVENTORIES',
    'EMPLOYEE_BENEFIT_EXPENSE',
    'FINANCE_COSTS',
    'DEPRECIATION_AND_AMORTIZATION_EXPENSE',
    'OTHER_EXPENSES',
    'CURRENT_TAX_EXPENSE',
    'DEFERRED_TAX_EXPENSE',
  ],
};

export const CURRENT_SCHEDULE_III_GROUPS = new Set<ScheduleIIIGroup>([
  'SHORT_TERM_BORROWINGS',
  'TRADE_PAYABLES',
  'OTHER_CURRENT_LIABILITIES',
  'SHORT_TERM_PROVISIONS',
  'CURRENT_INVESTMENTS',
  'INVENTORIES',
  'TRADE_RECEIVABLES',
  'CASH_AND_CASH_EQUIVALENTS',
  'SHORT_TERM_LOANS_AND_ADVANCES',
  'OTHER_CURRENT_ASSETS',
]);

export const SCHEDULE_III_GROUP_LABELS: Record<ScheduleIIIGroup, string> = {
  SHARE_CAPITAL: 'Share Capital',
  RESERVES_AND_SURPLUS: 'Reserves and Surplus',
  SHARE_APPLICATION_MONEY: 'Share Application Money Pending Allotment',
  LONG_TERM_BORROWINGS: 'Long-term Borrowings',
  DEFERRED_TAX_LIABILITIES: 'Deferred Tax Liabilities (Net)',
  OTHER_LONG_TERM_LIABILITIES: 'Other Long-term Liabilities',
  LONG_TERM_PROVISIONS: 'Long-term Provisions',
  SHORT_TERM_BORROWINGS: 'Short-term Borrowings',
  TRADE_PAYABLES: 'Trade Payables',
  OTHER_CURRENT_LIABILITIES: 'Other Current Liabilities',
  SHORT_TERM_PROVISIONS: 'Short-term Provisions',
  TANGIBLE_ASSETS: 'Tangible Assets',
  INTANGIBLE_ASSETS: 'Intangible Assets',
  CAPITAL_WORK_IN_PROGRESS: 'Capital Work-in-Progress',
  INTANGIBLE_ASSETS_UNDER_DEVELOPMENT: 'Intangible Assets under Development',
  NON_CURRENT_INVESTMENTS: 'Non-current Investments',
  DEFERRED_TAX_ASSETS: 'Deferred Tax Assets (Net)',
  LONG_TERM_LOANS_AND_ADVANCES: 'Long-term Loans and Advances',
  OTHER_NON_CURRENT_ASSETS: 'Other Non-current Assets',
  CURRENT_INVESTMENTS: 'Current Investments',
  INVENTORIES: 'Inventories',
  TRADE_RECEIVABLES: 'Trade Receivables',
  CASH_AND_CASH_EQUIVALENTS: 'Cash and Cash Equivalents',
  SHORT_TERM_LOANS_AND_ADVANCES: 'Short-term Loans and Advances',
  OTHER_CURRENT_ASSETS: 'Other Current Assets',
  REVENUE_FROM_OPERATIONS: 'Revenue from Operations',
  OTHER_INCOME: 'Other Income',
  COST_OF_MATERIALS_CONSUMED: 'Cost of Materials Consumed',
  PURCHASES_OF_STOCK_IN_TRADE: 'Purchases of Stock-in-Trade',
  CHANGES_IN_INVENTORIES: 'Changes in Inventories of Finished Goods, Work-in-Progress and Stock-in-Trade',
  EMPLOYEE_BENEFIT_EXPENSE: 'Employee Benefit Expense',
  FINANCE_COSTS: 'Finance Costs',
  DEPRECIATION_AND_AMORTIZATION_EXPENSE: 'Depreciation and Amortization Expense',
  OTHER_EXPENSES: 'Other Expenses',
  CURRENT_TAX_EXPENSE: 'Current Tax',
  DEFERRED_TAX_EXPENSE: 'Deferred Tax',
};
