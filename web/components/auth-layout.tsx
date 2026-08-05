import { BRAND_NAME, BRAND_TAGLINE, LogoMark } from './brand';

/**
 * Shared full-bleed dark hero used by every auth page (login/register/forgot/reset) —
 * matches the Stitch "Lumina Wealth" reference: dark emerald backdrop with soft ambient
 * blobs, a centered logo + wordmark + tagline, and a floating light card for the form.
 */
export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-emerald-deep px-4 py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '24px 24px' }}
      />
      <div aria-hidden="true" className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -right-20 h-96 w-96 rounded-full bg-black/20 blur-3xl" />

      <div className="relative z-10 mb-8 flex flex-col items-center text-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-white p-2 shadow-lg">
          <LogoMark className="h-full w-full" />
        </div>
        <h1 className="font-serif text-4xl font-bold text-white">{BRAND_NAME}</h1>
        <p className="mt-2 max-w-xs text-sm italic text-white/70">{BRAND_TAGLINE}</p>
      </div>

      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">{children}</div>
    </div>
  );
}
