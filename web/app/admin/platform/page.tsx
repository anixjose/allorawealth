'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RequireRole } from '@/components/require-role';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, Thead, Tbody, Tr, Th, Td, EmptyState } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormField, Input } from '@/components/ui/input';
import { useRoles, useStaffUsers } from '@/lib/hooks';
import { useAuth } from '@/lib/auth-context';
import * as api from '@/lib/api-client';
import type { StaffUser, UserCategory } from '@/lib/types';

const FIXED_ROLE_NAMES = [
  'INVESTOR',
  'ADMIN',
  'INVESTMENT_MANAGER',
  'FINANCE_OFFICER',
  'COMPLIANCE_OFFICER',
  'APPROVER',
  'SUPER_ADMIN',
];

/** Every module a custom User Category can be granted read-only (VIEW) access to — only 'VIEW' exists today, see RequirePermission. */
const PERMISSION_MODULES = [
  'INVESTORS',
  'DEPOSITS',
  'WITHDRAWALS',
  'INVESTMENTS',
  'REPAYMENTS',
  'RECONCILIATION',
  'REPORTS',
];

function CreateCategoryForm() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      api.createRole(accessToken!, {
        name,
        description: description || undefined,
        permissions: Array.from(permissions),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setName('');
      setDescription('');
      setPermissions(new Set());
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to create category'),
  });

  function toggleModule(module: string) {
    setPermissions((prev) => {
      const next = new Set(prev);
      const key = `${module}:VIEW`;
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Define a User Category</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-xs text-gray-500">
          A custom category grants read-only (View) access to just the modules you tick below — it never grants any
          write/approval action, and it&apos;s additive alongside the seven fixed roles.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            mutation.mutate();
          }}
          className="space-y-4"
        >
          <FormField label="Category name" htmlFor="categoryName">
            <Input id="categoryName" required placeholder="e.g. Auditor" value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>
          <FormField label="Description (optional)" htmlFor="categoryDescription">
            <Input
              id="categoryDescription"
              placeholder="e.g. Read-only audit access"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </FormField>
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">View access</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PERMISSION_MODULES.map((module) => (
                <label key={module} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={permissions.has(`${module}:VIEW`)}
                    onChange={() => toggleModule(module)}
                  />
                  {module}
                </label>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={mutation.isPending} className="w-full">
            {mutation.isPending ? 'Creating…' : 'Create category'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function CategoryRow({ category, canManage }: { category: UserCategory; canManage: boolean }) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const isFixed = FIXED_ROLE_NAMES.includes(category.name);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [description, setDescription] = useState(category.description ?? '');
  const [permissions, setPermissions] = useState<Set<string>>(new Set(category.permissions));
  const [error, setError] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['roles'] });

  const saveMutation = useMutation({
    mutationFn: async () => {
      await api.updateRole(accessToken!, category.id, { name, description: description || undefined });
      await api.updateRolePermissions(accessToken!, category.id, Array.from(permissions));
    },
    onSuccess: () => {
      invalidate();
      setEditing(false);
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to save category'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteRole(accessToken!, category.id),
    onSuccess: invalidate,
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to delete category'),
  });

  function toggleModule(module: string) {
    setPermissions((prev) => {
      const next = new Set(prev);
      const key = `${module}:VIEW`;
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function startEdit() {
    setName(category.name);
    setDescription(category.description ?? '');
    setPermissions(new Set(category.permissions));
    setError(null);
    setEditing(true);
  }

  function handleDelete() {
    setError(null);
    if (window.confirm(`Delete the "${category.name}" category? This can't be undone.`)) {
      deleteMutation.mutate();
    }
  }

  if (editing) {
    return (
      <Tr>
        <Td colSpan={5}>
          <div className="space-y-3 rounded-lg border border-brand-200 bg-brand-50/40 p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label="Category name" htmlFor={`edit-name-${category.id}`}>
                <Input id={`edit-name-${category.id}`} value={name} onChange={(e) => setName(e.target.value)} />
              </FormField>
              <FormField label="Description" htmlFor={`edit-desc-${category.id}`}>
                <Input
                  id={`edit-desc-${category.id}`}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </FormField>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-gray-700">View access</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {PERMISSION_MODULES.map((module) => (
                  <label key={module} className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={permissions.has(`${module}:VIEW`)}
                      onChange={() => toggleModule(module)}
                    />
                    {module}
                  </label>
                ))}
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <Button
                className="text-xs"
                disabled={saveMutation.isPending}
                onClick={() => {
                  setError(null);
                  saveMutation.mutate();
                }}
              >
                {saveMutation.isPending ? 'Saving…' : 'Save'}
              </Button>
              <Button variant="secondary" className="text-xs" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Td>
      </Tr>
    );
  }

  return (
    <Tr>
      <Td className="font-medium text-gray-900">{category.name}</Td>
      <Td>
        <Badge tone={isFixed ? 'blue' : 'gray'}>{isFixed ? 'Fixed role' : 'Custom category'}</Badge>
      </Td>
      <Td>{category.description ?? '—'}</Td>
      <Td>
        {category.permissions.length === 0 ? (
          <span className="text-xs text-gray-400">{isFixed ? 'Governed by role' : 'None granted'}</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {category.permissions.map((p) => (
              <Badge key={p} tone="green">
                {p.replace(':VIEW', '')}
              </Badge>
            ))}
          </div>
        )}
      </Td>
      <Td>
        {!canManage ? (
          <span className="text-xs text-gray-400">Super Admin only</span>
        ) : (
          <div className="flex flex-col gap-1">
            <div className="flex gap-2">
              <Button variant="ghost" className="px-2 py-1 text-xs" onClick={startEdit}>
                Edit
              </Button>
              <Button
                variant="danger"
                className="px-2 py-1 text-xs"
                disabled={deleteMutation.isPending}
                onClick={handleDelete}
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
        )}
      </Td>
    </Tr>
  );
}

function CategoriesTable({ categories, canManage }: { categories: UserCategory[]; canManage: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>User Categories</CardTitle>
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <EmptyState message="No categories yet." />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Type</Th>
                <Th>Description</Th>
                <Th>View access</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {categories.map((c) => (
                <CategoryRow key={c.id} category={c} canManage={canManage} />
              ))}
            </Tbody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function CreateStaffUserForm({ categories }: { categories: UserCategory[] }) {
  const { accessToken, hasRole } = useAuth();
  const isSuperAdmin = hasRole('SUPER_ADMIN');
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleIds, setRoleIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      api.createStaffUser(accessToken!, {
        firstName,
        lastName,
        email,
        password,
        roleIds: Array.from(roleIds),
      }),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: ['users', 'staff'] });
      setSuccess(
        `Created ${user.email} (${user.employeeNumber}) — they can log in immediately with the password you set.`,
      );
      setFirstName('');
      setLastName('');
      setEmail('');
      setPassword('');
      setRoleIds(new Set());
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to create user'),
  });

  function toggleRole(id: string) {
    setRoleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create an internal User ID</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            setSuccess(null);
            mutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <FormField label="First name" htmlFor="staffFirstName">
              <Input id="staffFirstName" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </FormField>
            <FormField label="Last name" htmlFor="staffLastName">
              <Input id="staffLastName" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </FormField>
          </div>
          <FormField label="Email" htmlFor="staffEmail">
            <Input id="staffEmail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </FormField>
          <FormField label="Temporary password" htmlFor="staffPassword">
            <Input
              id="staffPassword"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </FormField>
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">User Category (one or more)</p>
            <div className="space-y-1">
              {categories.map((c) => {
                const isSuperAdminCategory = c.name === 'SUPER_ADMIN';
                const disabled = isSuperAdminCategory && !isSuperAdmin;
                return (
                  <label key={c.id} className={`flex items-center gap-2 text-sm ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>
                    <input type="checkbox" disabled={disabled} checked={roleIds.has(c.id)} onChange={() => toggleRole(c.id)} />
                    {c.name}
                    {isSuperAdminCategory && !isSuperAdmin ? (
                      <span className="text-xs text-gray-400">(Super Admin only)</span>
                    ) : (
                      !FIXED_ROLE_NAMES.includes(c.name) && (
                        <span className="text-xs text-gray-400">
                          ({c.permissions.length > 0 ? c.permissions.join(', ') : 'no view access granted'})
                        </span>
                      )
                    )}
                  </label>
                );
              })}
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-700">{success}</p>}
          <Button type="submit" disabled={mutation.isPending || roleIds.size === 0} className="w-full">
            {mutation.isPending ? 'Creating…' : 'Create user'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

const STAFF_STATUS_TONE: Record<string, 'green' | 'gray' | 'amber'> = {
  ACTIVE: 'green',
  SUSPENDED: 'amber',
  DISABLED: 'gray',
};

function StaffRow({ staffMember, categories, isSelf }: { staffMember: StaffUser; categories: UserCategory[]; isSelf: boolean }) {
  const { accessToken, hasRole } = useAuth();
  const isSuperAdmin = hasRole('SUPER_ADMIN');
  const targetIsSuperAdmin = staffMember.userRoles.some((ur) => ur.role.name === 'SUPER_ADMIN');
  const canManageTarget = !targetIsSuperAdmin || isSuperAdmin;
  const canEditOwnCategory = !isSelf || isSuperAdmin;
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(staffMember.firstName);
  const [lastName, setLastName] = useState(staffMember.lastName);
  const [email, setEmail] = useState(staffMember.email);
  const [roleIds, setRoleIds] = useState<Set<string>>(new Set(staffMember.userRoles.map((ur) => ur.role.id)));
  const [error, setError] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['users', 'staff'] });

  const saveMutation = useMutation({
    mutationFn: ({ skipRoleIds }: { skipRoleIds: boolean }) =>
      api.updateStaffUser(accessToken!, staffMember.id, {
        firstName,
        lastName,
        email,
        ...(skipRoleIds ? {} : { roleIds: Array.from(roleIds) }),
      }),
    onSuccess: () => {
      invalidate();
      setEditing(false);
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to save user'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteStaffUser(accessToken!, staffMember.id),
    onSuccess: invalidate,
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to delete user'),
  });

  const reactivateMutation = useMutation({
    mutationFn: () => api.updateStaffUser(accessToken!, staffMember.id, { status: 'ACTIVE' }),
    onSuccess: invalidate,
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to reactivate user'),
  });

  function toggleRole(id: string) {
    setRoleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function startEdit() {
    setFirstName(staffMember.firstName);
    setLastName(staffMember.lastName);
    setEmail(staffMember.email);
    setRoleIds(new Set(staffMember.userRoles.map((ur) => ur.role.id)));
    setError(null);
    setEditing(true);
  }

  function handleDelete() {
    setError(null);
    if (window.confirm(`Delete (disable) ${staffMember.firstName} ${staffMember.lastName}? They'll immediately lose access; this is reversible via Edit.`)) {
      deleteMutation.mutate();
    }
  }

  if (editing) {
    return (
      <Tr>
        <Td colSpan={6}>
          <div className="space-y-3 rounded-lg border border-brand-200 bg-brand-50/40 p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <FormField label="First name" htmlFor={`edit-fn-${staffMember.id}`}>
                <Input id={`edit-fn-${staffMember.id}`} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </FormField>
              <FormField label="Last name" htmlFor={`edit-ln-${staffMember.id}`}>
                <Input id={`edit-ln-${staffMember.id}`} value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </FormField>
              <FormField label="Email" htmlFor={`edit-email-${staffMember.id}`}>
                <Input id={`edit-email-${staffMember.id}`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </FormField>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-gray-700">User Category (one or more)</p>
              {!canEditOwnCategory && (
                <p className="mb-2 text-xs text-amber-600">
                  You cannot edit your own Job Role / User Category — only Super Admin can.
                </p>
              )}
              <div className="space-y-1">
                {categories.map((c) => {
                  const isSuperAdminCategory = c.name === 'SUPER_ADMIN';
                  const disabled = !canEditOwnCategory || (isSuperAdminCategory && !isSuperAdmin);
                  return (
                    <label key={c.id} className={`flex items-center gap-2 text-sm ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>
                      <input type="checkbox" disabled={disabled} checked={roleIds.has(c.id)} onChange={() => toggleRole(c.id)} />
                      {c.name}
                      {isSuperAdminCategory && !isSuperAdmin && (
                        <span className="text-xs text-gray-400">(Super Admin only)</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <Button
                className="text-xs"
                disabled={saveMutation.isPending || (canEditOwnCategory && roleIds.size === 0)}
                onClick={() => {
                  setError(null);
                  saveMutation.mutate({ skipRoleIds: !canEditOwnCategory });
                }}
              >
                {saveMutation.isPending ? 'Saving…' : 'Save'}
              </Button>
              <Button variant="secondary" className="text-xs" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Td>
      </Tr>
    );
  }

  return (
    <Tr>
      <Td>
        {staffMember.firstName} {staffMember.lastName}
        {isSelf && <span className="ml-1 text-xs text-gray-400">(you)</span>}
      </Td>
      <Td className="font-mono text-xs">{staffMember.employeeNumber ?? '—'}</Td>
      <Td>{staffMember.email}</Td>
      <Td>
        <div className="flex flex-wrap gap-1">
          {staffMember.userRoles.map((ur) => (
            <Badge key={ur.role.id} tone="blue">
              {ur.role.name}
            </Badge>
          ))}
        </div>
      </Td>
      <Td>
        <Badge tone={STAFF_STATUS_TONE[staffMember.status] ?? 'gray'}>{staffMember.status}</Badge>
      </Td>
      <Td>
        {!canManageTarget ? (
          <span className="text-xs text-gray-400">Super Admin only</span>
        ) : (
          <div className="flex flex-col gap-1">
            <div className="flex gap-2">
              <Button variant="ghost" className="px-2 py-1 text-xs" onClick={startEdit}>
                Edit
              </Button>
              {staffMember.status === 'DISABLED' ? (
                isSuperAdmin && (
                  <Button
                    variant="secondary"
                    className="px-2 py-1 text-xs"
                    disabled={reactivateMutation.isPending}
                    onClick={() => reactivateMutation.mutate()}
                  >
                    {reactivateMutation.isPending ? 'Reactivating…' : 'Reactivate'}
                  </Button>
                )
              ) : (
                !isSelf && (
                  <Button
                    variant="danger"
                    className="px-2 py-1 text-xs"
                    disabled={deleteMutation.isPending}
                    onClick={handleDelete}
                  >
                    {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
                  </Button>
                )
              )}
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
        )}
      </Td>
    </Tr>
  );
}

function StaffDirectory({ categories }: { categories: UserCategory[] }) {
  const { data: staff, isLoading } = useStaffUsers();
  const { user } = useAuth();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Staff directory</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : !staff || staff.length === 0 ? (
          <EmptyState message="No staff users yet." />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Employee #</Th>
                <Th>Email</Th>
                <Th>Categories</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {staff.map((u) => (
                <StaffRow key={u.id} staffMember={u} categories={categories} isSelf={u.id === user?.id} />
              ))}
            </Tbody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function PlatformAdminContent() {
  const { data: categories, isLoading } = useRoles();
  const { hasRole } = useAuth();
  const canManageCategories = hasRole('SUPER_ADMIN');

  if (isLoading || !categories) {
    return <p className="text-sm text-gray-400">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Platform Admin</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage internal staff identities and the User Categories that control what they can see.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {canManageCategories ? (
          <CreateCategoryForm />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Define a User Category</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                Adding, editing, and deleting User Categories is Super Admin only. You can still select any existing
                category when creating or editing a staff user below.
              </p>
            </CardContent>
          </Card>
        )}
        <CategoriesTable categories={categories} canManage={canManageCategories} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CreateStaffUserForm categories={categories} />
        <StaffDirectory categories={categories} />
      </div>
    </div>
  );
}

export default function PlatformAdminPage() {
  return (
    <RequireRole roles={['ADMIN', 'SUPER_ADMIN']}>
      <PlatformAdminContent />
    </RequireRole>
  );
}
