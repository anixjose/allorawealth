'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RequireRole } from '@/components/require-role';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, Thead, Tbody, Tr, Th, Td, EmptyState } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormField, Input, Select } from '@/components/ui/input';
import { Tabs } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth-context';
import { useCompanies, useOpportunities, useProducts } from '@/lib/hooks';
import * as api from '@/lib/api-client';
import { formatMoney, formatDate } from '@/lib/format-money';

function CompaniesTab() {
  const { accessToken } = useAuth();
  const { data: companies } = useCompanies();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ companyCode: '', legalName: '', registrationNumber: '', country: '' });
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () => api.createCompany(accessToken!, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setForm({ companyCode: '', legalName: '', registrationNumber: '', country: '' });
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to create company'),
  });

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>New company</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              createMutation.mutate();
            }}
            className="space-y-3"
          >
            <FormField label="Company code" htmlFor="companyCode">
              <Input id="companyCode" required value={form.companyCode} onChange={(e) => setForm({ ...form, companyCode: e.target.value })} />
            </FormField>
            <FormField label="Legal name" htmlFor="legalName">
              <Input id="legalName" required value={form.legalName} onChange={(e) => setForm({ ...form, legalName: e.target.value })} />
            </FormField>
            <FormField label="Registration number" htmlFor="registrationNumber">
              <Input
                id="registrationNumber"
                required
                value={form.registrationNumber}
                onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })}
              />
            </FormField>
            <FormField label="Country" htmlFor="country">
              <Input id="country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </FormField>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={createMutation.isPending} className="w-full">
              {createMutation.isPending ? 'Creating…' : 'Create company'}
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Companies</CardTitle>
        </CardHeader>
        <CardContent>
          {!companies || companies.length === 0 ? (
            <EmptyState message="No companies yet." />
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Code</Th>
                  <Th>Legal name</Th>
                  <Th>Country</Th>
                  <Th>Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                {companies.map((c) => (
                  <Tr key={c.id}>
                    <Td>{c.companyCode}</Td>
                    <Td>{c.legalName}</Td>
                    <Td>{c.country ?? '—'}</Td>
                    <Td>
                      <StatusBadge status={c.status} />
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ProductsTab() {
  const { accessToken } = useAuth();
  const { data: products } = useProducts();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    productCode: '',
    name: '',
    minimumAmount: '',
    expectedRoi: '',
    roiType: 'BULLET' as 'MONTHLY' | 'QUARTERLY' | 'BULLET',
    tenureMonths: '12',
  });
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      api.createProduct(accessToken!, {
        productCode: form.productCode,
        name: form.name,
        minimumAmount: form.minimumAmount,
        expectedRoi: form.expectedRoi,
        roiType: form.roiType,
        tenureMonths: Number(form.tenureMonths),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setForm({ productCode: '', name: '', minimumAmount: '', expectedRoi: '', roiType: 'BULLET', tenureMonths: '12' });
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to create product'),
  });

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>New product</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              createMutation.mutate();
            }}
            className="space-y-3"
          >
            <FormField label="Product code" htmlFor="productCode">
              <Input id="productCode" required value={form.productCode} onChange={(e) => setForm({ ...form, productCode: e.target.value })} />
            </FormField>
            <FormField label="Name" htmlFor="name">
              <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </FormField>
            <FormField label="Minimum amount" htmlFor="minimumAmount">
              <Input
                id="minimumAmount"
                type="number"
                step="0.01"
                required
                value={form.minimumAmount}
                onChange={(e) => setForm({ ...form, minimumAmount: e.target.value })}
              />
            </FormField>
            <FormField label="Expected ROI (%)" htmlFor="expectedRoi">
              <Input
                id="expectedRoi"
                type="number"
                step="0.01"
                required
                value={form.expectedRoi}
                onChange={(e) => setForm({ ...form, expectedRoi: e.target.value })}
              />
            </FormField>
            <FormField label="ROI type" htmlFor="roiType">
              <Select
                id="roiType"
                value={form.roiType}
                onChange={(e) => setForm({ ...form, roiType: e.target.value as typeof form.roiType })}
              >
                <option value="BULLET">Bullet</option>
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
              </Select>
            </FormField>
            <FormField label="Tenure (months)" htmlFor="tenureMonths">
              <Input
                id="tenureMonths"
                type="number"
                min="1"
                required
                value={form.tenureMonths}
                onChange={(e) => setForm({ ...form, tenureMonths: e.target.value })}
              />
            </FormField>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={createMutation.isPending} className="w-full">
              {createMutation.isPending ? 'Creating…' : 'Create product'}
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Products</CardTitle>
        </CardHeader>
        <CardContent>
          {!products || products.length === 0 ? (
            <EmptyState message="No products yet." />
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Code</Th>
                  <Th>Name</Th>
                  <Th>ROI</Th>
                  <Th>Tenure</Th>
                  <Th>Min. amount</Th>
                </Tr>
              </Thead>
              <Tbody>
                {products.map((p) => (
                  <Tr key={p.id}>
                    <Td>{p.productCode}</Td>
                    <Td>{p.name}</Td>
                    <Td>
                      {p.expectedRoi}% ({p.roiType})
                    </Td>
                    <Td>{p.tenureMonths}mo</Td>
                    <Td>{formatMoney(p.minimumAmount)}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function OpportunitiesTab() {
  const { accessToken } = useAuth();
  const { data: opportunities } = useOpportunities();
  const { data: products } = useProducts();
  const { data: companies } = useCompanies();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    productId: '',
    companyId: '',
    name: '',
    targetAmount: '',
    minimumInvestment: '',
    expectedRoi: '',
    startDate: '',
    maturityDate: '',
  });
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () => api.createOpportunity(accessToken!, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      setForm({
        productId: '',
        companyId: '',
        name: '',
        targetAmount: '',
        minimumInvestment: '',
        expectedRoi: '',
        startDate: '',
        maturityDate: '',
      });
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to create opportunity'),
  });

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>New opportunity</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              createMutation.mutate();
            }}
            className="space-y-3"
          >
            <FormField label="Product" htmlFor="productId">
              <Select id="productId" required value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
                <option value="">Select a product…</option>
                {products?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Company" htmlFor="companyId">
              <Select id="companyId" required value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })}>
                <option value="">Select a company…</option>
                {companies?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.legalName}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Name" htmlFor="name">
              <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </FormField>
            <FormField label="Target amount" htmlFor="targetAmount">
              <Input
                id="targetAmount"
                type="number"
                step="0.01"
                required
                value={form.targetAmount}
                onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
              />
            </FormField>
            <FormField label="Minimum investment" htmlFor="minimumInvestment">
              <Input
                id="minimumInvestment"
                type="number"
                step="0.01"
                required
                value={form.minimumInvestment}
                onChange={(e) => setForm({ ...form, minimumInvestment: e.target.value })}
              />
            </FormField>
            <FormField label="Expected ROI (%)" htmlFor="expectedRoi">
              <Input
                id="expectedRoi"
                type="number"
                step="0.01"
                required
                value={form.expectedRoi}
                onChange={(e) => setForm({ ...form, expectedRoi: e.target.value })}
              />
            </FormField>
            <FormField label="Start date" htmlFor="startDate">
              <Input
                id="startDate"
                type="date"
                required
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </FormField>
            <FormField label="Maturity date" htmlFor="maturityDate">
              <Input
                id="maturityDate"
                type="date"
                required
                value={form.maturityDate}
                onChange={(e) => setForm({ ...form, maturityDate: e.target.value })}
              />
            </FormField>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={createMutation.isPending} className="w-full">
              {createMutation.isPending ? 'Creating…' : 'Create opportunity'}
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Opportunities</CardTitle>
        </CardHeader>
        <CardContent>
          {!opportunities || opportunities.length === 0 ? (
            <EmptyState message="No opportunities yet." />
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  <Th>Company</Th>
                  <Th>Min. investment</Th>
                  <Th>Maturity</Th>
                  <Th>Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                {opportunities.map((o) => (
                  <Tr key={o.id}>
                    <Td>{o.name}</Td>
                    <Td>{o.company?.legalName}</Td>
                    <Td>{formatMoney(o.minimumInvestment)}</Td>
                    <Td>{formatDate(o.maturityDate)}</Td>
                    <Td>
                      <StatusBadge status={o.status} />
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CatalogueContent() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Investment catalogue</h1>
      <Tabs
        tabs={[
          { key: 'opportunities', label: 'Opportunities', content: <OpportunitiesTab /> },
          { key: 'products', label: 'Products', content: <ProductsTab /> },
          { key: 'companies', label: 'Companies', content: <CompaniesTab /> },
        ]}
      />
    </div>
  );
}

export default function CataloguePage() {
  return (
    <RequireRole roles={['INVESTMENT_MANAGER', 'ADMIN', 'SUPER_ADMIN']}>
      <CatalogueContent />
    </RequireRole>
  );
}
