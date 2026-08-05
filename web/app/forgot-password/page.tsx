'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail } from 'lucide-react';
import { forgotPassword } from '@/lib/api-client';
import { BRAND_NAME, LogoMark } from '@/components/brand';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPassword(email);
    } finally {
      // Always show the same generic confirmation, whether or not the email matched an account.
      setSubmitted(true);
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-white px-4 py-12">
      <div className="flex flex-col items-center gap-3">
        <LogoMark className="h-16 w-16" />
        <h1 className="font-serif text-xl font-bold text-emerald-800">{BRAND_NAME}</h1>
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        {submitted ? (
          <div className="text-center">
            <h2 className="text-lg font-semibold text-emerald-800">Check your email</h2>
            <p className="mt-2 text-sm text-gray-500">
              If an account exists for <span className="font-medium text-gray-700">{email}</span>, we&apos;ve sent a
              link to reset your password.
            </p>
            <Link href="/login" className="mt-5 inline-block text-sm font-medium text-emerald-700 hover:text-emerald-800">
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-center text-lg font-semibold text-emerald-800">Reset your password</h2>
            <p className="mt-2 text-center text-sm text-gray-500">
              Enter the email on your account and we&apos;ll send you a link to reset your password.
            </p>
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Email Address
                </label>
                <div className="relative mt-1.5">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="investor@allora.com"
                    className="w-full rounded-lg border border-emerald-100 bg-emerald-50/60 py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-emerald-800 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-900 disabled:bg-emerald-300"
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
            <p className="mt-5 text-center text-sm text-gray-500">
              Remembered it?{' '}
              <Link href="/login" className="font-medium text-emerald-700 hover:text-emerald-800">
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
