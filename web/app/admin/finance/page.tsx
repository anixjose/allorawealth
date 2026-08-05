'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RequireRole } from '@/components/require-role';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, Thead, Tbody, Tr, Th, Td, EmptyState } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormField, Input, Select } from '@/components/ui/input';
import { useAccounts } from '@/lib/hooks';
import { useAuth } from '@/lib/auth-context';
import * as api from '@/lib/api-client';
import type { Account, AccountType, ScheduleIIIGroup } from '@/lib/types';
import { SCHEDULE_III_GROUPS_BY_ACCOUNT_TYPE, SCHEDULE_III_GROUP_LABELS } from '@/lib/types';

const ACCOUNT_TYPES: AccountType[] = ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'];

/** Depth-first, hierarchically-ordered flattening — every account can be a parent, at any depth. */
function flattenAccountTree(accounts: Account[]): { account: Account; depth: number }[] {
  const childrenByParent = new Map<string, Account[]>();
  const roots: Account[] = [];
  for (const a of accounts) {
    if (a.parentAccountId) {
      const list = childrenByParent.get(a.parentAccountId) ?? [];
      list.push(a);
      childrenByParent.set(a.parentAccountId, list);
    } else {
      roots.push(a);
    }
  }
  for (const list of childrenByParent.values()) {
    list.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
  }
  roots.sort((a, b) => a.accountCode.localeCompare(b.accountCode));

  const result: { account: Account; depth: number }[] = [];
  function visit(account: Account, depth: number) {
    result.push({ account, depth });
    for (const child of childrenByParent.get(account.id) ?? []) {
      visit(child, depth + 1);
    }
  }
  for (const root of roots) visit(root, 0);
  return result;
}

function ScheduleIIIGroupSelect({
  id,
  accountType,
  value,
  onChange,
}: {
  id: string;
  accountType: AccountType;
  value: ScheduleIIIGroup;
  onChange: (group: ScheduleIIIGroup) => void;
}) {
  const options = SCHEDULE_III_GROUPS_BY_ACCOUNT_TYPE[accountType];
  return (
    <Select id={id} value={value} onChange={(e) => onChange(e.target.value as ScheduleIIIGroup)}>
      {options.map((g) => (
        <option key={g} value={g}>
          {SCHEDULE_III_GROUP_LABELS[g]}
        </option>
      ))}
    </Select>
  );
}

function CreateGlAccountForm() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const [accountCode, setAccountCode] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('ASSET');
  const [scheduleIiiGroup, setScheduleIiiGroup] = useState<ScheduleIIIGroup>(
    SCHEDULE_III_GROUPS_BY_ACCOUNT_TYPE.ASSET[0],
  );
  const [error, setError] = useState<string | null>(null);

  function handleAccountTypeChange(next: AccountType) {
    setAccountType(next);
    setScheduleIiiGroup(SCHEDULE_III_GROUPS_BY_ACCOUNT_TYPE[next][0]);
  }

  const mutation = useMutation({
    mutationFn: () => api.createAccount(accessToken!, { accountCode, accountName, accountType, scheduleIiiGroup }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setAccountCode('');
      setAccountName('');
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to create GL account'),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>New GL Account</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-xs text-gray-500">
          A GL account is a top-level entry in the chart of accounts (e.g. &ldquo;1000 ASSETS&rdquo;) — it groups the
          Sub Ledgers created underneath it.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            mutation.mutate();
          }}
          className="space-y-4"
        >
          <FormField label="Account code" htmlFor="glCode">
            <Input
              id="glCode"
              required
              placeholder="e.g. 6000"
              pattern="\d{3,6}"
              title="3-6 digits"
              value={accountCode}
              onChange={(e) => setAccountCode(e.target.value)}
            />
          </FormField>
          <FormField label="Account name" htmlFor="glName">
            <Input
              id="glName"
              required
              placeholder="e.g. CONTINGENCY RESERVE"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
            />
          </FormField>
          <FormField label="Account type" htmlFor="glType">
            <Select id="glType" value={accountType} onChange={(e) => handleAccountTypeChange(e.target.value as AccountType)}>
              {ACCOUNT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Schedule III group" htmlFor="glScheduleGroup">
            <ScheduleIIIGroupSelect
              id="glScheduleGroup"
              accountType={accountType}
              value={scheduleIiiGroup}
              onChange={setScheduleIiiGroup}
            />
          </FormField>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={mutation.isPending} className="w-full">
            {mutation.isPending ? 'Creating…' : 'Create GL Account'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function CreateSubLedgerForm({ accounts }: { accounts: Account[] }) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const flattened = flattenAccountTree(accounts);
  const [parentAccountId, setParentAccountId] = useState(flattened[0]?.account.id ?? '');
  const [accountCode, setAccountCode] = useState('');
  const [accountName, setAccountName] = useState('');
  const [scheduleIiiGroup, setScheduleIiiGroup] = useState<ScheduleIIIGroup>(
    SCHEDULE_III_GROUPS_BY_ACCOUNT_TYPE[flattened[0]?.account.accountType ?? 'ASSET'][0],
  );
  const [error, setError] = useState<string | null>(null);

  const parent = accounts.find((a) => a.id === parentAccountId);

  function handleParentChange(id: string) {
    setParentAccountId(id);
    const newParent = accounts.find((a) => a.id === id);
    if (newParent) {
      setScheduleIiiGroup(SCHEDULE_III_GROUPS_BY_ACCOUNT_TYPE[newParent.accountType][0]);
    }
  }

  const mutation = useMutation({
    mutationFn: () => {
      if (!parent) throw new Error('Choose a parent account first');
      return api.createAccount(accessToken!, {
        accountCode,
        accountName,
        accountType: parent.accountType,
        scheduleIiiGroup,
        parentAccountId: parent.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setAccountCode('');
      setAccountName('');
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to create account'),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Sub Ledger / Ledger Account</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-xs text-gray-500">
          Nest a new account under any existing one — under a GL account (e.g. &ldquo;1010 Bank Account&rdquo; under
          &ldquo;1000 ASSETS&rdquo;), or one level deeper under a Sub Ledger to create individual Ledger Accounts (e.g.
          &ldquo;ICICI Bank A/C 001&rdquo; and &ldquo;HDFC Bank A/C 002&rdquo; under &ldquo;Bank Account&rdquo;, or
          &ldquo;Computers&rdquo;, &ldquo;Software&rdquo;, &ldquo;Vehicles&rdquo; under &ldquo;Property, Plant and
          Equipment&rdquo;). It always inherits its parent&apos;s account type, but its Schedule III group is chosen
          independently.
        </p>
        {flattened.length === 0 ? (
          <p className="text-sm text-gray-500">Create a GL account first.</p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              mutation.mutate();
            }}
            className="space-y-4"
          >
            <FormField label="Parent account" htmlFor="subParent">
              <Select id="subParent" value={parentAccountId} onChange={(e) => handleParentChange(e.target.value)}>
                {flattened.map(({ account: a, depth }) => (
                  <option key={a.id} value={a.id}>
                    {'  '.repeat(depth)}
                    {depth > 0 ? '↳ ' : ''}
                    {a.accountCode} — {a.accountName} ({a.accountType})
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Account code" htmlFor="subCode">
              <Input
                id="subCode"
                required
                placeholder="e.g. 1050"
                pattern="\d{3,6}"
                title="3-6 digits"
                value={accountCode}
                onChange={(e) => setAccountCode(e.target.value)}
              />
            </FormField>
            <FormField label="Account name" htmlFor="subName">
              <Input
                id="subName"
                required
                placeholder="e.g. ICICI Bank A/C 001"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
              />
            </FormField>
            {parent && (
              <FormField label="Schedule III group" htmlFor="subScheduleGroup">
                <ScheduleIIIGroupSelect
                  id="subScheduleGroup"
                  accountType={parent.accountType}
                  value={scheduleIiiGroup}
                  onChange={setScheduleIiiGroup}
                />
              </FormField>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={mutation.isPending} className="w-full">
              {mutation.isPending ? 'Creating…' : 'Create Account'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function AccountRow({ account, depth }: { account: Account; depth: number }) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [accountName, setAccountName] = useState(account.accountName);
  const [scheduleIiiGroup, setScheduleIiiGroup] = useState(account.scheduleIiiGroup);
  const [error, setError] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['accounts'] });

  const saveMutation = useMutation({
    mutationFn: () => api.updateAccount(accessToken!, account.id, { accountName, scheduleIiiGroup }),
    onSuccess: () => {
      invalidate();
      setEditing(false);
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to save account'),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: () => api.updateAccount(accessToken!, account.id, { status: account.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }),
    onSuccess: invalidate,
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to update status'),
  });

  if (editing) {
    return (
      <Tr>
        <Td colSpan={6}>
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-brand-200 bg-brand-50/40 p-3">
            <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} className="max-w-sm" />
            <ScheduleIIIGroupSelect
              id={`edit-group-${account.id}`}
              accountType={account.accountType}
              value={scheduleIiiGroup}
              onChange={setScheduleIiiGroup}
            />
            <Button className="px-3 py-1.5 text-xs" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
              {saveMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
            <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            {error && <p className="w-full text-xs text-red-600">{error}</p>}
          </div>
        </Td>
      </Tr>
    );
  }

  return (
    <Tr>
      <Td className="font-mono text-xs">{account.accountCode}</Td>
      <Td
        className={depth > 0 ? 'text-gray-700' : 'font-medium text-gray-900'}
        style={depth > 0 ? { paddingLeft: `${1 + depth * 1.25}rem` } : undefined}
      >
        {account.accountName}
      </Td>
      <Td>
        <Badge tone="blue">{account.accountType}</Badge>
      </Td>
      <Td className="text-xs text-gray-600">{SCHEDULE_III_GROUP_LABELS[account.scheduleIiiGroup]}</Td>
      <Td>
        <Badge tone={account.status === 'ACTIVE' ? 'green' : 'gray'}>{account.status}</Badge>
      </Td>
      <Td>
        <div className="flex flex-col gap-1">
          <div className="flex gap-2">
            <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Button
              variant="secondary"
              className="px-2 py-1 text-xs"
              disabled={toggleStatusMutation.isPending}
              onClick={() => toggleStatusMutation.mutate()}
            >
              {account.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
            </Button>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      </Td>
    </Tr>
  );
}

function ChartOfAccountsTable({ accounts }: { accounts: Account[] }) {
  const flattened = flattenAccountTree(accounts);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chart of Accounts</CardTitle>
      </CardHeader>
      <CardContent>
        {accounts.length === 0 ? (
          <EmptyState message="No accounts yet." />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Code</Th>
                <Th>Name</Th>
                <Th>Type</Th>
                <Th>Schedule III Group</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {flattened.map(({ account, depth }) => (
                <AccountRow key={account.id} account={account} depth={depth} />
              ))}
            </Tbody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function FinanceModuleContent() {
  const { data: accounts, isLoading } = useAccounts();

  if (isLoading || !accounts) {
    return <p className="text-sm text-gray-400">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Finance</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage the chart of accounts: create new GL accounts and nest Sub Ledgers or Ledger Accounts underneath them,
          to any depth.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CreateGlAccountForm />
        <CreateSubLedgerForm accounts={accounts} />
      </div>

      <ChartOfAccountsTable accounts={accounts} />
    </div>
  );
}

export default function FinanceModulePage() {
  return (
    <RequireRole roles={['FINANCE_OFFICER', 'ADMIN', 'SUPER_ADMIN']}>
      <FinanceModuleContent />
    </RequireRole>
  );
}
