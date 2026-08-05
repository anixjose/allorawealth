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

export interface Account {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: string;
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
export interface ProfitAndLoss {
  income: AccountBalanceRow[];
  expense: AccountBalanceRow[];
  totalIncome: string;
  totalExpense: string;
  netProfit: string;
}
export interface BalanceSheet {
  assets: AccountBalanceRow[];
  liabilities: AccountBalanceRow[];
  equity: AccountBalanceRow[];
  totalAssets: string;
  totalLiabilities: string;
  totalEquity: string;
  balanced: boolean;
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
