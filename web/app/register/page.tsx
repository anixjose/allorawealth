'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { login, registerInvestor, registerBusiness } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { FormField, Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brand } from '@/components/brand';

type EntityType = 'INDIVIDUAL' | 'BUSINESS';

export default function RegisterPage() {
  const { setAuth } = useAuth();
  const router = useRouter();
  const [entityType, setEntityType] = useState<EntityType>('INDIVIDUAL');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (entityType === 'INDIVIDUAL') {
        await registerInvestor({ firstName, lastName, email, password });
      } else {
        await registerBusiness({ businessName, registrationNumber, email, password });
      }
      const res = await login(email, password);
      setAuth(res.accessToken, res.user);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <Brand size="lg" />
          <CardTitle className="mt-4 text-base font-medium text-gray-700">Create your account</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setEntityType('INDIVIDUAL')}
              className={`rounded-md py-1.5 text-sm font-medium transition-colors ${
                entityType === 'INDIVIDUAL' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              Individual
            </button>
            <button
              type="button"
              onClick={() => setEntityType('BUSINESS')}
              className={`rounded-md py-1.5 text-sm font-medium transition-colors ${
                entityType === 'BUSINESS' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              Business
            </button>
          </div>
          <p className="mb-4 text-xs text-gray-500">
            New accounts are reviewed by our team before you can deposit, withdraw, or invest — you can sign in and
            explore the portal right away while that&apos;s pending.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            {entityType === 'INDIVIDUAL' ? (
              <div className="grid grid-cols-2 gap-3">
                <FormField label="First name" htmlFor="firstName">
                  <Input id="firstName" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </FormField>
                <FormField label="Last name" htmlFor="lastName">
                  <Input id="lastName" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </FormField>
              </div>
            ) : (
              <>
                <FormField label="Business name" htmlFor="businessName">
                  <Input
                    id="businessName"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                  />
                </FormField>
                <FormField label="Registration number" htmlFor="registrationNumber">
                  <Input
                    id="registrationNumber"
                    required
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                  />
                </FormField>
              </>
            )}
            <FormField label="Email" htmlFor="email">
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </FormField>
            <FormField label="Password" htmlFor="password">
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </FormField>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-500">
            Already registered?{' '}
            <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
