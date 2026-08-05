'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import type { AuthUser } from './types';

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  ready: boolean;
}

interface AuthContextValue extends AuthState {
  setAuth: (accessToken: string, user: AuthUser) => void;
  logout: () => void;
  hasRole: (...roles: string[]) => boolean;
  hasPermission: (permission: string) => boolean;
}

const STORAGE_KEY = 'investment-platform.auth';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ accessToken: null, user: null, ready: false });

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setState({ accessToken: parsed.accessToken, user: parsed.user, ready: true });
        return;
      } catch {
        // fall through to unauthenticated state
      }
    }
    setState((s) => ({ ...s, ready: true }));
  }, []);

  const setAuth = useCallback((accessToken: string, user: AuthUser) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ accessToken, user }));
    setState({ accessToken, user, ready: true });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState({ accessToken: null, user: null, ready: true });
  }, []);

  const hasRole = useCallback(
    (...roles: string[]) => !!state.user && roles.some((r) => state.user!.roles.includes(r as never)),
    [state.user],
  );

  /** Mirrors the backend's RolesGuard OR-logic: a custom User Category's granted permission is additive to fixed roles. */
  const hasPermission = useCallback(
    (permission: string) => !!state.user && state.user.permissions.includes(permission),
    [state.user],
  );

  return (
    <AuthContext.Provider value={{ ...state, setAuth, logout, hasRole, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export const STAFF_ROLES = ['ADMIN', 'SUPER_ADMIN', 'FINANCE_OFFICER', 'APPROVER', 'INVESTMENT_MANAGER', 'COMPLIANCE_OFFICER'];
