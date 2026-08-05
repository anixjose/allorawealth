'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { login } from '@/lib/api-client';
import { useAuth, STAFF_ROLES } from '@/lib/auth-context';
import { BRAND_NAME, BRAND_TAGLINE, LogoMark } from '@/components/brand';

export default function LoginPage() {
  const { setAuth } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await login(email, password);
      setAuth(res.accessToken, res.user);
      const isStaff = STAFF_ROLES.some((role) => res.user.roles.includes(role as never));
      router.push(isStaff ? '/admin/dashboard' : '/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col items-center justify-center gap-8 border-r border-gray-100 bg-white px-12 lg:flex">
        <div className="flex flex-col items-center gap-4 text-center">
          <LogoMark className="h-28 w-28" />
          <h1 className="font-serif text-3xl font-bold text-emerald-800">{BRAND_NAME}</h1>
        </div>
        <p className="max-w-xs text-center text-2xl font-bold leading-snug text-emerald-800">{BRAND_TAGLINE}</p>
      </div>

      <div className="flex flex-col items-center justify-center gap-8 bg-white px-4 py-12">
        <div className="flex flex-col items-center gap-3 lg:hidden">
          <LogoMark className="h-16 w-16" />
          <h1 className="font-serif text-xl font-bold text-emerald-800">{BRAND_NAME}</h1>
        </div>

        <div className="w-full max-w-sm text-center">
          <h2 className="text-3xl font-bold text-emerald-800">Welcome Back</h2>
          <p className="mt-2 text-sm text-gray-500">Please sign in to access your dashboard.</p>
        </div>

        <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
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

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs font-medium text-emerald-700 hover:text-emerald-800">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-emerald-800 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-900 disabled:bg-emerald-300"
            >
              {loading ? 'Signing in…' : 'Login'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-500">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-medium text-emerald-700 hover:text-emerald-800">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
