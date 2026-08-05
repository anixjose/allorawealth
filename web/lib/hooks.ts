'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from './auth-context';
import * as api from './api-client';
import type { DepositStatus, RepaymentStatus, WithdrawalStatus } from './types';

/** Every hook below is a no-op query (enabled: false) until a token exists, so pages never fire an unauthenticated request. */

export function useMyInvestor() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['investors', 'me'],
    queryFn: () => api.getMyInvestor(accessToken!),
    enabled: !!accessToken,
  });
}

export function useInvestor(id?: string) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['investors', id],
    queryFn: () => api.getInvestor(accessToken!, id!),
    enabled: !!accessToken && !!id,
  });
}

export function useWalletPosition(investorId?: string) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['wallet', 'position', investorId],
    queryFn: () => api.getWalletPosition(accessToken!, investorId!),
    enabled: !!accessToken && !!investorId,
  });
}

export function useWalletTransactions(investorId?: string) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['wallet', 'transactions', investorId],
    queryFn: () => api.getWalletTransactions(accessToken!, investorId!),
    enabled: !!accessToken && !!investorId,
  });
}

export function useOpportunities() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['opportunities'],
    queryFn: () => api.listOpportunities(accessToken!),
    enabled: !!accessToken,
  });
}

export function useOpportunity(id?: string) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['opportunities', id],
    queryFn: () => api.getOpportunity(accessToken!, id!),
    enabled: !!accessToken && !!id,
  });
}

export function useInvestments(investorId?: string) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['investments', investorId ?? 'all'],
    queryFn: () => api.listInvestments(accessToken!, investorId),
    enabled: !!accessToken,
  });
}

export function useInvestment(id?: string) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['investments', 'detail', id],
    queryFn: () => api.getInvestment(accessToken!, id!),
    enabled: !!accessToken && !!id,
  });
}

export function useWithdrawals(filters: { investorId?: string; status?: WithdrawalStatus } = {}) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['withdrawals', filters],
    queryFn: () => api.listWithdrawals(accessToken!, filters),
    enabled: !!accessToken,
  });
}

export function useDeposits(filters: { investorId?: string; status?: DepositStatus } = {}) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['deposits', filters],
    queryFn: () => api.listDeposits(accessToken!, filters),
    enabled: !!accessToken,
  });
}

export function useRepayments(filters: { investmentId?: string; status?: RepaymentStatus } = {}) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['repayments', filters],
    queryFn: () => api.listRepayments(accessToken!, filters),
    enabled: !!accessToken,
  });
}

export function useInvestorsDirectory() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['investors', 'all'],
    queryFn: () => api.listInvestors(accessToken!),
    enabled: !!accessToken,
  });
}

export function useReportsSummary() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['reports', 'summary'],
    queryFn: () => api.getReportsSummary(accessToken!),
    enabled: !!accessToken,
  });
}

export function useReconciliations() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['reconciliation'],
    queryFn: () => api.listReconciliations(accessToken!),
    enabled: !!accessToken,
  });
}

export function useProducts() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['products'],
    queryFn: () => api.listProducts(accessToken!),
    enabled: !!accessToken,
  });
}

export function useCompanies() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['companies'],
    queryFn: () => api.listCompanies(accessToken!),
    enabled: !!accessToken,
  });
}

export function useAccounts() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.listAccounts(accessToken!),
    enabled: !!accessToken,
  });
}

export function useRoles() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['roles'],
    queryFn: () => api.listRoles(accessToken!),
    enabled: !!accessToken,
  });
}

export function useStaffUsers() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['users', 'staff'],
    queryFn: () => api.listStaffUsers(accessToken!),
    enabled: !!accessToken,
  });
}

export function useManagementReport() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['reports', 'management'],
    queryFn: () => api.getManagementReport(accessToken!),
    enabled: !!accessToken,
  });
}

export function useTrialBalance() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['reports', 'trial-balance'],
    queryFn: () => api.getTrialBalance(accessToken!),
    enabled: !!accessToken,
  });
}

export function useGeneralLedger(accountCode?: string) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['reports', 'general-ledger', accountCode],
    queryFn: () => api.getGeneralLedger(accessToken!, accountCode!),
    enabled: !!accessToken && !!accountCode,
  });
}

export function useProfitAndLoss() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['reports', 'profit-and-loss'],
    queryFn: () => api.getProfitAndLoss(accessToken!),
    enabled: !!accessToken,
  });
}

export function useBalanceSheet() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['reports', 'balance-sheet'],
    queryFn: () => api.getBalanceSheet(accessToken!),
    enabled: !!accessToken,
  });
}

export function useCashBook() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['reports', 'cash-book'],
    queryFn: () => api.getCashBook(accessToken!),
    enabled: !!accessToken,
  });
}

export function useCashFlowStatement() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['reports', 'cash-flow'],
    queryFn: () => api.getCashFlowStatement(accessToken!),
    enabled: !!accessToken,
  });
}

export function useInvestorLiabilities() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['reports', 'investor-liabilities'],
    queryFn: () => api.getInvestorLiabilities(accessToken!),
    enabled: !!accessToken,
  });
}

export function useInvestorRoiReport() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['reports', 'investor-roi'],
    queryFn: () => api.getInvestorRoiReport(accessToken!),
    enabled: !!accessToken,
  });
}

export function useInvestmentReceivables() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['reports', 'investment-receivables'],
    queryFn: () => api.getInvestmentReceivables(accessToken!),
    enabled: !!accessToken,
  });
}

export function useInvestorStatement(investorId?: string) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['reports', 'investor-statement', investorId],
    queryFn: () => api.getInvestorStatement(accessToken!, investorId!),
    enabled: !!accessToken && !!investorId,
  });
}

export function useRoiStatement(investorId?: string) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['reports', 'roi-statement', investorId],
    queryFn: () => api.getRoiStatement(accessToken!, investorId!),
    enabled: !!accessToken && !!investorId,
  });
}

export function useRepaymentStatement(investorId?: string) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['reports', 'repayment-statement', investorId],
    queryFn: () => api.getRepaymentStatement(accessToken!, investorId!),
    enabled: !!accessToken && !!investorId,
  });
}
