'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail } from 'lucide-react';
import { forgotPassword } from '@/lib/api-client';
import { AuthLayout } from '@/components/auth-layout';

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
    <AuthLayout>
      {submitted ? (
        <div className="text-center">
          <h2 className="font-serif text-lg font-semibold text-emerald-deep">Check your email</h2>
          <p className="mt-2 text-sm text-gray-500">
            If an account exists for <span className="font-medium text-gray-700">{email}</span>, we&apos;ve sent a
            link to reset your password.
          </p>
          <Link href="/login" className="mt-5 inline-block text-sm font-semibold text-warm-gold hover:text-warm-gold/80">
            Back to sign in
          </Link>
        </div>
      ) : (
        <>
          <h2 className="text-center font-serif text-lg font-semibold text-emerald-deep">Reset your password</h2>
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
                  className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-royal-blue focus:outline-none focus:ring-1 focus:ring-royal-blue"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-emerald-deep py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-deep/90 disabled:bg-emerald-deep/40"
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
          <p className="mt-5 text-center text-sm text-gray-500">
            Remembered it?{' '}
            <Link href="/login" className="font-semibold text-warm-gold hover:text-warm-gold/80">
              Back to sign in
            </Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
}
