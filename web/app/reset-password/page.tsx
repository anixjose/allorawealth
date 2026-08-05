'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { ApiClientError, resetPassword } from '@/lib/api-client';
import { BRAND_NAME, LogoMark } from '@/components/brand';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, newPassword);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="text-center">
        <h2 className="text-lg font-semibold text-emerald-800">Invalid reset link</h2>
        <p className="mt-2 text-sm text-gray-500">
          This link is missing its reset token. Request a new one from the forgot password page.
        </p>
        <Link
          href="/forgot-password"
          className="mt-5 inline-block text-sm font-medium text-emerald-700 hover:text-emerald-800"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center">
        <h2 className="text-lg font-semibold text-emerald-800">Password reset</h2>
        <p className="mt-2 text-sm text-gray-500">Your password has been changed. You can now sign in.</p>
        <Link href="/login" className="mt-5 inline-block text-sm font-medium text-emerald-700 hover:text-emerald-800">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-center text-lg font-semibold text-emerald-800">Set a new password</h2>
      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label htmlFor="newPassword" className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            New Password
          </label>
          <div className="relative mt-1.5">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              id="newPassword"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-emerald-100 bg-emerald-50/60 py-2.5 pl-10 pr-10 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Confirm Password
          </label>
          <div className="relative mt-1.5">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-emerald-100 bg-emerald-50/60 py-2.5 pl-10 pr-10 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-emerald-800 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-900 disabled:bg-emerald-300"
        >
          {loading ? 'Resetting…' : 'Reset password'}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-white px-4 py-12">
      <div className="flex flex-col items-center gap-3">
        <LogoMark className="h-16 w-16" />
        <h1 className="font-serif text-xl font-bold text-emerald-800">{BRAND_NAME}</h1>
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <Suspense fallback={<p className="text-center text-sm text-gray-400">Loading…</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
