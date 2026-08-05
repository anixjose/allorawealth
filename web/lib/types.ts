export type Role =
  | 'INVESTOR'
  | 'ADMIN'
  | 'INVESTMENT_MANAGER'
  | 'FINANCE_OFFICER'
  | 'COMPLIANCE_OFFICER'
  | 'APPROVER'
  | 'SUPER_ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: Role[];
  permissions: string[];
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export interface Investor {
  id: string;
  investorNumber: string;
  entityType: 'INDIVIDUAL' | 'BUSINESS';
  businessName: string | null;
  registrationNumber: string | null;
  kycStatus: string;
  amlStatus: string;
  status: string;
  createdAt: string;
  user: { id: string; firstName: string; lastName: string; email: string };
  wallet: { id: string; walletNumber: string; currency: string; status: string } | null;
}

export interface WalletPosition {
  walletId: string;
  walletNumber: string;
  currency: string;
  availableBalance: string;
  investedPrincipal: string;
  pendingAmount: string;
  expectedRoi: string;
  realisedRoi: string;
  totalPosition: string;
}

export interface WalletTransaction {
  id: string;
  transactionNumber: string;
  transactionType: string;
  direction: 'CREDIT' | 'DEBIT';
  amount: string;
  currency: string;
  referenceType: string;
  referenceId: string;
  status: string;
  createdAt: string;
  postedAt: string | null;
}

export interface InvestmentProduct {
  id: string;
  productCode: string;
  name: string;
  description: string | null;
  minimumAmount: string;
  maximumAmount: string | null;
  expectedRoi: string;
  roiType: 'MONTHLY' | 'QUARTERLY' | 'BULLET';
  tenureMonths: number;
  currency: string;
  riskLevel: string | null;
  status: string;
}

export interface InvestmentCompany {
  id: string;
  companyCode: string;
  legalName: string;
  registrationNumber: string;
  country: string | null;
  kycStatus: string;
  status: string;
}

export interface InvestmentOpportunity {
  id: string;
  productId: string;
  companyId: string;
  name: string;
  description: string | null;
  targetAmount: string;
  minimumInvestment: string;
  expectedRoi: string;
  startDate: string;
  maturityDate: string;
  status: string;
  product?: InvestmentProduct;
  company?: InvestmentCompany;
}

export interface RepaymentSchedule {
  id: string;
  investmentId: string;
  dueDate: string;
  principalDue: string;
  roiDue: string;
  totalDue: string;
  status: string;
  roiAccruedAt: string | null;
}

export interface Investment {
  id: string;
  investmentNumber: string;
  investorId: string;
  opportunityId: string;
  principalAmount: string;
  investmentDate: string;
  maturityDate: string;
  expectedRoi: string;
  actualRoi: string | null;
  status: string;
  repaymentSchedules?: RepaymentSchedule[];
  opportunity?: InvestmentOpportunity;
}

export type WithdrawalStatus =
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'REJECTED'
  | 'FAILED'
  | 'CANCELLED';

export interface Withdrawal {
  id: string;
  withdrawalNumber: string;
  investorId: string;
  amount: string;
  currency: string;
  status: WithdrawalStatus;
  requestedById: string;
  approvedById: string | null;
  rejectionReason: string | null;
  requestedAt: string;
  approvedAt: string | null;
  completedAt: string | null;
}

export type DepositStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Deposit {
  id: string;
  depositNumber: string;
  investorId: string;
  amount: string;
  currency: string;
  paymentReference: string;
  status: DepositStatus;
  requestedById: string;
  approvedById: string | null;
  rejectionReason: string | null;
  requestedAt: string;
  approvedAt: string | null;
}

export type RepaymentStatus = 'POSTED' | 'RECEIVED' | 'DISBURSED' | 'REVERSED';

export interface Repayment {
  id: string;
  investmentId: string;
  scheduleId: string | null;
  paymentDate: string;
  principalAmount: string;
  roiAmount: string;
  otherAmount: string;
  totalAmount: string;
  status: RepaymentStatus;
  disbursedAt: string | null;
  createdAt: string;
  investment?: {
    investmentNumber: string;
    investorId: string;
    investor?: { investorNumber: string; user?: { firstName: string; lastName: string } };
  };
  recordedBy?: { id: string; firstName: string; lastName: string; email: string } | null;
  disbursedBy?: { id: string; firstName: string; lastName: string; email: string } | null;
}

export interface DisburseRepaymentsResult {
  results: Array<{ repaymentId: string; success: boolean; error?: string }>;
}

export interface ReportsSummary {
  totalInvestors: number;
  totalWalletBalance: string;
  totalInvested: string;
  totalRoiPaid: string;
  pendingWithdrawals: { count: number; amount: string };
}

export interface Reconciliation {
  id: string;
  reconciliationNumber: string;
  reconciliationDate: string;
  accountId: string;
  currency: string;
  glBalance: string;
  subledgerBalance: string;
  difference: string;
  status: 'RECONCILED' | 'EXCEPTION';
  account?: { accountCode: string; accountName: string };
  items?: ReconciliationItem[];
}

export interface ReconciliationItem {
  id: string;
  reconciliationId: string;
  investorId: string;
  accountId: string;
  glAmount: string;
  subledgerAmount: string;
  difference: string;
  exceptionType: string;
  status: string;
  investor?: { investorNumber: string };
}

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
export type AccountStatus = 'ACTIVE' | 'INACTIVE';

/**
 * Schedule III (Division I), Companies Act 2013 — full set of sub-heads, shown regardless of
 * whether any account/balance exists for a given head. Excludes only concepts this ledger has
 * no underlying data model for: Exceptional/Extraordinary items, discontinued operations, and
 * Earnings Per Share (requires a share-count/face-value model this system doesn't have).
 */
export type ScheduleIIIGroup =
  | 'SHARE_CAPITAL'
  | 'RESERVES_AND_SURPLUS'
  | 'SHARE_APPLICATION_MONEY'
  | 'LONG_TERM_BORROWINGS'
  | 'DEFERRED_TAX_LIABILITIES'
  | 'OTHER_LONG_TERM_LIABILITIES'
  | 'LONG_TERM_PROVISIONS'
  | 'SHORT_TERM_BORROWINGS'
  | 'TRADE_PAYABLES'
  | 'OTHER_CURRENT_LIABILITIES'
  | 'SHORT_TERM_PROVISIONS'
  | 'TANGIBLE_ASSETS'
  | 'INTANGIBLE_ASSETS'
  | 'CAPITAL_WORK_IN_PROGRESS'
  | 'INTANGIBLE_ASSETS_UNDER_DEVELOPMENT'
  | 'NON_CURRENT_INVESTMENTS'
  | 'DEFERRED_TAX_ASSETS'
  | 'LONG_TERM_LOANS_AND_ADVANCES'
  | 'OTHER_NON_CURRENT_ASSETS'
  | 'CURRENT_INVESTMENTS'
  | 'INVENTORIES'
  | 'TRADE_RECEIVABLES'
  | 'CASH_AND_CASH_EQUIVALENTS'
  | 'SHORT_TERM_LOANS_AND_ADVANCES'
  | 'OTHER_CURRENT_ASSETS'
  | 'REVENUE_FROM_OPERATIONS'
  | 'OTHER_INCOME'
  | 'COST_OF_MATERIALS_CONSUMED'
  | 'PURCHASES_OF_STOCK_IN_TRADE'
  | 'CHANGES_IN_INVENTORIES'
  | 'EMPLOYEE_BENEFIT_EXPENSE'
  | 'FINANCE_COSTS'
  | 'DEPRECIATION_AND_AMORTIZATION_EXPENSE'
  | 'OTHER_EXPENSES'
  | 'CURRENT_TAX_EXPENSE'
  | 'DEFERRED_TAX_EXPENSE';

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

export interface Account {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  parentAccountId: string | null;
  currency: string;
  status: AccountStatus;
  scheduleIiiGroup: ScheduleIIIGroup;
}

export interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  accountType: string;
  totalDebit: string;
  totalCredit: string;
}
export interface TrialBalance {
  rows: TrialBalanceRow[];
  totalDebit: string;
  totalCredit: string;
  balanced: boolean;
}

export interface LedgerLine {
  date: string;
  journalNumber: string;
  transactionType: string;
  description: string | null;
  investorId: string | null;
  investorNumber: string | null;
  debit: string;
  credit: string;
  runningBalance: string;
}
export interface AccountLedger {
  account: { accountCode: string; accountName: string; accountType: string };
  lines: LedgerLine[];
  endingBalance: string;
}

export interface AccountBalanceRow {
  accountCode: string;
  accountName: string;
  balance: string;
}

/** One Schedule III sub-head (e.g. "Other Current Liabilities") with its constituent accounts. */
export interface ScheduleIIILineItem {
  group: ScheduleIIIGroup;
  label: string;
  accounts: AccountBalanceRow[];
  total: string;
}
export interface ScheduleIIISection {
  items: ScheduleIIILineItem[];
  total: string;
}

/** Statement of Profit and Loss, Schedule III (Division I). No tax is modeled in this ledger, so profitForThePeriod === profitBeforeTax. */
/** Statement of Profit and Loss, Schedule III (Division I). Every section always present. */
export interface ProfitAndLoss {
  revenueFromOperations: ScheduleIIISection;
  otherIncome: ScheduleIIISection;
  totalRevenue: string;
  costOfMaterialsConsumed: ScheduleIIISection;
  purchasesOfStockInTrade: ScheduleIIISection;
  changesInInventories: ScheduleIIISection;
  employeeBenefitExpense: ScheduleIIISection;
  financeCosts: ScheduleIIISection;
  depreciationAndAmortization: ScheduleIIISection;
  otherExpenses: ScheduleIIISection;
  totalExpenses: string;
  profitBeforeTax: string;
  currentTax: ScheduleIIISection;
  deferredTax: ScheduleIIISection;
  totalTax: string;
  profitForThePeriod: string;
}

/** Balance Sheet, Schedule III (Division I) vertical format. Every sub-head always present. */
export interface BalanceSheet {
  equityAndLiabilities: {
    shareholdersFunds: ScheduleIIISection;
    shareApplicationMoney: ScheduleIIISection;
    nonCurrentLiabilities: ScheduleIIISection;
    currentLiabilities: ScheduleIIISection;
    total: string;
  };
  assets: {
    nonCurrentAssets: ScheduleIIISection;
    currentAssets: ScheduleIIISection;
    total: string;
  };
  balanced: boolean;
}

/** Cash Flow Statement (direct method) — "since inception" convention, matching this app's other reports. */
export interface CashFlowActivity {
  label: string;
  items: { transactionType: string; amount: string }[];
  total: string;
}
export interface CashFlowStatement {
  operatingActivities: CashFlowActivity;
  investingActivities: CashFlowActivity;
  financingActivities: CashFlowActivity;
  unclassifiedActivities: CashFlowActivity;
  netIncreaseInCash: string;
  cashAtBeginning: string;
  cashAtEnd: string;
  reconciled: boolean;
}

export interface InvestorLiabilityRow {
  investorId: string;
  investorNumber: string;
  walletLiability: string;
  investmentPayable: string;
  roiPayable: string;
  total: string;
}
export interface InvestorRoiRow {
  investorId: string;
  investorNumber: string;
  accrued: string;
  received: string;
  outstanding: string;
}
export interface InvestmentReceivableRow {
  investmentId: string;
  investmentNumber: string;
  investorId: string;
  investorNumber: string;
  outstandingReceivable: string;
}

export interface InvestorStatementRow {
  date: string;
  transactionType: string;
  debit: string | null;
  credit: string | null;
  balance: string;
}
export interface RoiStatementRow {
  date: string;
  type: 'ACCRUED' | 'RECEIVED';
  investmentNumber: string;
  amount: string;
}
export interface RepaymentStatementRow {
  date: string;
  investmentNumber: string;
  principalAmount: string;
  roiAmount: string;
  otherAmount: string;
  totalAmount: string;
  status: string;
}

export interface MaturityBucketInvestment {
  investmentId: string;
  investmentNumber: string;
  investorId: string;
  investorNumber: string;
  principalAmount: string;
  maturityDate: string;
}
export interface MaturityBucket {
  label: string;
  count: number;
  totalPrincipal: string;
  investments: MaturityBucketInvestment[];
}
export interface DefaultedInvestmentItem {
  investmentId: string;
  investmentNumber: string;
  investorId: string;
  investorNumber: string;
  principalAmount: string;
  status: string;
  defaultedAt: string | null;
  defaultReason: string | null;
}
export interface ManagementReport extends ReportsSummary {
  totalAUM: string;
  totalInvestorFunds: string;
  totalInvestments: string;
  totalRoiAccrued: string;
  cashPosition: string;
  maturityAnalysis: MaturityBucket[];
  defaultedInvestments: { count: number; totalPrincipal: string; items: DefaultedInvestmentItem[] };
}

export interface UserCategory {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
}

export interface StaffUser {
  id: string;
  employeeNumber: string | null;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  createdAt: string;
  userRoles: { role: { id: string; name: string } }[];
}

export interface DeleteStaffUserResult {
  deleted: boolean;
  user: StaffUser | null;
}

export interface ApiError {
  statusCode: number;
  timestamp: string;
  error: { message: string | string[]; error: string; statusCode: number } | string;
}
