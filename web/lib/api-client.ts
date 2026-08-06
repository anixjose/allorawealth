import type {
  Account,
  AccountLedger,
  AccountStatus,
  AccountType,
  BalanceSheet,
  CashFlowStatement,
  Deposit,
  DepositStatus,
  DisburseRepaymentsResult,
  Investment,
  InvestmentCompany,
  InvestmentOpportunity,
  InvestmentProduct,
  InvestmentReceivableRow,
  Investor,
  InvestorLiabilityRow,
  InvestorRoiRow,
  InvestorStatementRow,
  LoginResponse,
  ManagementReport,
  ProfitAndLoss,
  Reconciliation,
  ReconciliationItem,
  Repayment,
  RepaymentStatementRow,
  RepaymentStatus,
  ReportsSummary,
  RoiStatementRow,
  ScheduleIIIGroup,
  DeleteStaffUserResult,
  StaffUser,
  TrialBalance,
  UserCategory,
  WalletPosition,
  WalletTransaction,
  Withdrawal,
  WithdrawalStatus,
} from './types';

import { AUTH_STORAGE_KEY } from './auth-context';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export class ApiClientError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function extractMessage(body: unknown): string {
  if (body && typeof body === 'object' && 'error' in body) {
    const err = (body as { error: unknown }).error;
    if (typeof err === 'string') return err;
    if (err && typeof err === 'object' && 'message' in err) {
      const message = (err as { message: unknown }).message;
      return Array.isArray(message) ? message.join(', ') : String(message);
    }
  }
  return 'Request failed';
}

async function request<T>(
  path: string,
  options: { method?: string; token?: string | null; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: 'no-store',
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;

  if (!res.ok) {
    // A 401 on an authenticated request means the session token expired or was revoked —
    // clear it and bounce to login instead of leaving every page stuck on "Loading…" forever
    // (queries don't retry, so isLoading turns false but data stays undefined). A 401 from an
    // unauthenticated call (e.g. bad login credentials) has no token attached, so it's exempt.
    if (res.status === 401 && options.token && typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    throw new ApiClientError(res.status, extractMessage(data));
  }
  return data as T;
}

// ---- Auth ----
export const login = (email: string, password: string) =>
  request<LoginResponse>('/auth/login', { method: 'POST', body: { email, password } });

export const changePassword = (token: string, currentPassword: string, newPassword: string) =>
  request<{ message: string }>('/auth/change-password', {
    method: 'POST',
    token,
    body: { currentPassword, newPassword },
  });

export const forgotPassword = (email: string) =>
  request<{ message: string }>('/auth/forgot-password', { method: 'POST', body: { email } });

export const resetPassword = (token: string, newPassword: string) =>
  request<{ message: string }>('/auth/reset-password', { method: 'POST', body: { token, newPassword } });

// ---- Investors ----
export const registerInvestor = (dto: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  nationality?: string;
  country?: string;
}) => request<{ investor: Investor; user: { id: string; email: string } }>('/investors/register', {
  method: 'POST',
  body: dto,
});

export const registerBusiness = (dto: {
  businessName: string;
  registrationNumber: string;
  email: string;
  password: string;
  country?: string;
}) => request<{ investor: Investor; user: { id: string; email: string } }>('/investors/register-business', {
  method: 'POST',
  body: dto,
});

export const getMyInvestor = (token: string) => request<Investor>('/investors/me', { token });
export const getInvestor = (token: string, id: string) => request<Investor>(`/investors/${id}`, { token });
export const listInvestors = (token: string) => request<Investor[]>('/investors', { token });
export const approveInvestor = (token: string, id: string) =>
  request<Investor>(`/investors/${id}/approve`, { method: 'POST', token });

// ---- Wallet ----
export const getWalletPosition = (token: string, investorId: string) =>
  request<WalletPosition>(`/wallets/${investorId}/position`, { token });
export const getWalletTransactions = (token: string, investorId: string) =>
  request<WalletTransaction[]>(`/wallets/${investorId}/transactions`, { token });

// ---- Investment catalogue ----
export const listOpportunities = (token: string) =>
  request<InvestmentOpportunity[]>('/investment-opportunities', { token });
export const getOpportunity = (token: string, id: string) =>
  request<InvestmentOpportunity>(`/investment-opportunities/${id}`, { token });
export const createOpportunity = (
  token: string,
  dto: {
    productId: string;
    companyId: string;
    name: string;
    description?: string;
    targetAmount: string;
    minimumInvestment: string;
    expectedRoi: string;
    startDate: string;
    maturityDate: string;
  },
) => request<InvestmentOpportunity>('/investment-opportunities', { method: 'POST', token, body: dto });

export const listProducts = (token: string) => request<InvestmentProduct[]>('/investment-products', { token });
export const createProduct = (
  token: string,
  dto: {
    productCode: string;
    name: string;
    description?: string;
    minimumAmount: string;
    maximumAmount?: string;
    expectedRoi: string;
    roiType: 'MONTHLY' | 'QUARTERLY' | 'BULLET';
    tenureMonths: number;
    currency?: string;
    riskLevel?: string;
  },
) => request<InvestmentProduct>('/investment-products', { method: 'POST', token, body: dto });

export const listCompanies = (token: string) => request<InvestmentCompany[]>('/investment-companies', { token });
export const createCompany = (
  token: string,
  dto: { companyCode: string; legalName: string; registrationNumber: string; country?: string },
) => request<InvestmentCompany>('/investment-companies', { method: 'POST', token, body: dto });

// ---- Investments ----
export const invest = (token: string, dto: { investorId: string; opportunityId: string; amount: string }) =>
  request<Investment>('/investments', { method: 'POST', token, body: dto });
export const listInvestments = (token: string, investorId?: string) =>
  request<Investment[]>(`/investments${investorId ? `?investorId=${investorId}` : ''}`, { token });
export const getInvestment = (token: string, id: string) => request<Investment>(`/investments/${id}`, { token });

// ---- Repayments ----
export const accrueRoi = (token: string, scheduleId: string) =>
  request(`/repayment-schedules/${scheduleId}/accrue-roi`, { method: 'POST', token });
export const recordRepayment = (
  token: string,
  dto: { investmentId: string; scheduleId?: string; principalAmount?: string; roiAmount?: string; otherAmount?: string },
) => request<Repayment>('/repayments', { method: 'POST', token, body: dto });
export const listRepayments = (token: string, filters: { investmentId?: string; status?: RepaymentStatus } = {}) => {
  const params = new URLSearchParams();
  if (filters.investmentId) params.set('investmentId', filters.investmentId);
  if (filters.status) params.set('status', filters.status);
  const qs = params.toString();
  return request<Repayment[]>(`/repayments${qs ? `?${qs}` : ''}`, { token });
};
export const disburseRepayments = (token: string, repaymentIds: string[]) =>
  request<DisburseRepaymentsResult>('/repayments/disburse', { method: 'POST', token, body: { repaymentIds } });

// ---- Deposits ----
export const requestDeposit = (
  token: string,
  dto: { investorId: string; amount: string; currency: string; paymentReference: string },
) => request<Deposit>('/deposits', { method: 'POST', token, body: dto });
export const listDeposits = (token: string, filters: { investorId?: string; status?: DepositStatus } = {}) => {
  const params = new URLSearchParams();
  if (filters.investorId) params.set('investorId', filters.investorId);
  if (filters.status) params.set('status', filters.status);
  const qs = params.toString();
  return request<Deposit[]>(`/deposits${qs ? `?${qs}` : ''}`, { token });
};
export const approveDeposit = (token: string, id: string) =>
  request<Deposit>(`/deposits/${id}/approve`, { method: 'POST', token });
export const rejectDeposit = (token: string, id: string, reason: string) =>
  request<Deposit>(`/deposits/${id}/reject`, { method: 'POST', token, body: { reason } });

// ---- Withdrawals ----
export const requestWithdrawal = (token: string, dto: { investorId: string; amount: string; currency: string }) =>
  request<Withdrawal>('/withdrawals', { method: 'POST', token, body: dto });
export const listWithdrawals = (token: string, filters: { investorId?: string; status?: WithdrawalStatus } = {}) => {
  const params = new URLSearchParams();
  if (filters.investorId) params.set('investorId', filters.investorId);
  if (filters.status) params.set('status', filters.status);
  const qs = params.toString();
  return request<Withdrawal[]>(`/withdrawals${qs ? `?${qs}` : ''}`, { token });
};
export const approveWithdrawal = (token: string, id: string) =>
  request<Withdrawal>(`/withdrawals/${id}/approve`, { method: 'POST', token });
export const completeWithdrawal = (token: string, id: string) =>
  request<Withdrawal>(`/withdrawals/${id}/complete`, { method: 'POST', token });
export const rejectWithdrawal = (token: string, id: string, reason: string) =>
  request<Withdrawal>(`/withdrawals/${id}/reject`, { method: 'POST', token, body: { reason } });

// ---- Reconciliation ----
export const runReconciliation = (token: string) =>
  request<Reconciliation[]>('/reconciliation/run', { method: 'POST', token });
export const listReconciliations = (token: string) => request<Reconciliation[]>('/reconciliation', { token });
export const getReconciliationItems = (token: string, id: string) =>
  request<ReconciliationItem[]>(`/reconciliation/${id}/items`, { token });

// ---- Reports ----
export const getReportsSummary = (token: string) => request<ReportsSummary>('/reports/summary', { token });
export const getManagementReport = (token: string) => request<ManagementReport>('/reports/management', { token });

// ---- Financial reports ----
export const getTrialBalance = (token: string) => request<TrialBalance>('/reports/financial/trial-balance', { token });
export const getGeneralLedger = (token: string, accountCode: string) =>
  request<AccountLedger>(`/reports/financial/general-ledger/${accountCode}`, { token });
export const getProfitAndLoss = (token: string) =>
  request<ProfitAndLoss>('/reports/financial/profit-and-loss', { token });
export const getBalanceSheet = (token: string) => request<BalanceSheet>('/reports/financial/balance-sheet', { token });
export const getCashFlowStatement = (token: string) =>
  request<CashFlowStatement>('/reports/financial/cash-flow', { token });
export const getCashBook = (token: string) => request<AccountLedger>('/reports/financial/cash-book', { token });
export const getInvestorLiabilities = (token: string) =>
  request<{ rows: InvestorLiabilityRow[] }>('/reports/financial/investor-liabilities', { token });
export const getInvestorRoiReport = (token: string) =>
  request<{ rows: InvestorRoiRow[] }>('/reports/financial/investor-roi', { token });
export const getInvestmentReceivables = (token: string) =>
  request<{ rows: InvestmentReceivableRow[] }>('/reports/financial/investment-receivables', { token });

// ---- Investor statements ----
export const getInvestorStatement = (token: string, investorId: string) =>
  request<{ rows: InvestorStatementRow[] }>(`/reports/investor/${investorId}/statement`, { token });
export const getRoiStatement = (token: string, investorId: string) =>
  request<{ rows: RoiStatementRow[] }>(`/reports/investor/${investorId}/roi-statement`, { token });
export const getRepaymentStatement = (token: string, investorId: string) =>
  request<{ rows: RepaymentStatementRow[] }>(`/reports/investor/${investorId}/repayment-statement`, { token });

// ---- Investments: default marking ----
export const markInvestmentDefaulted = (token: string, investmentId: string, reason: string) =>
  request<Investment>(`/investments/${investmentId}/default`, { method: 'POST', token, body: { reason } });

// ---- Accounts (Finance Module: chart of accounts) ----
export const listAccounts = (token: string) => request<Account[]>('/accounts', { token });
export const createAccount = (
  token: string,
  dto: {
    accountCode: string;
    accountName: string;
    accountType: AccountType;
    scheduleIiiGroup: ScheduleIIIGroup;
    parentAccountId?: string;
    currency?: string;
  },
) => request<Account>('/accounts', { method: 'POST', token, body: dto });
export const updateAccount = (
  token: string,
  id: string,
  dto: { accountName?: string; status?: AccountStatus; scheduleIiiGroup?: ScheduleIIIGroup },
) => request<Account>(`/accounts/${id}`, { method: 'PATCH', token, body: dto });

// ---- User categories (roles) ----
export const listRoles = (token: string) => request<UserCategory[]>('/roles', { token });
export const createRole = (
  token: string,
  dto: { name: string; description?: string; permissions?: string[] },
) => request<UserCategory>('/roles', { method: 'POST', token, body: dto });
export const updateRolePermissions = (token: string, id: string, permissions: string[]) =>
  request<UserCategory>(`/roles/${id}/permissions`, { method: 'PATCH', token, body: { permissions } });
export const updateRole = (token: string, id: string, dto: { name?: string; description?: string }) =>
  request<UserCategory>(`/roles/${id}`, { method: 'PATCH', token, body: dto });
export const deleteRole = (token: string, id: string) =>
  request<void>(`/roles/${id}`, { method: 'DELETE', token });

// ---- Staff users ----
export const listStaffUsers = (token: string) => request<StaffUser[]>('/users', { token });
export const createStaffUser = (
  token: string,
  dto: { firstName: string; lastName: string; email: string; password: string; roleIds: string[] },
) => request<StaffUser>('/users', { method: 'POST', token, body: dto });
export const updateStaffUser = (
  token: string,
  id: string,
  dto: {
    firstName?: string;
    lastName?: string;
    email?: string;
    roleIds?: string[];
    status?: 'ACTIVE' | 'SUSPENDED' | 'DISABLED';
  },
) => request<StaffUser>(`/users/${id}`, { method: 'PATCH', token, body: dto });
export const deleteStaffUser = (token: string, id: string) =>
  request<DeleteStaffUserResult>(`/users/${id}`, { method: 'DELETE', token });
