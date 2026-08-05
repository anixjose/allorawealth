import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const stats = [
  { value: '$4.2B+', label: 'Assets Under Management' },
  { value: '18,400+', label: 'Active Investors' },
  { value: '14.7%', label: 'Average Annual Return' },
  { value: '12 Yrs', label: 'Market Experience' },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-ink">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.15) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      <div className="relative mx-auto max-w-7xl px-6 pb-20 pt-20 lg:px-10 lg:pt-28">
        <div className="inline-flex items-center gap-2 rounded-full border border-gold-500/40 bg-gold-500/5 px-4 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-gold-500" />
          <span className="text-xs font-semibold tracking-[0.2em] text-gold-400">TRUSTED SINCE 2012</span>
        </div>

        <h1 className="mt-8 font-serif text-5xl font-bold leading-[1.1] text-white sm:text-6xl">
          Your Investment
          <br />
          <span className="italic text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #f0d78a 0%, #c9973a 50%, #f0d78a 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text' }}>
            Partner.
          </span>
        </h1>

        <p className="mt-6 max-w-2xl font-sans text-xl text-slate-soft">Together, We Build Wealth.</p>

        <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-muted">
          Allora Wealth brings institutional investment discipline to private clients — preserving capital,
          compounding returns, and crafting strategies that outlast market cycles.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-md bg-gold-500 px-6 py-3.5 text-sm font-semibold text-ink transition-colors hover:bg-gold-400"
          >
            Start Investing <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#site-footer"
            className="rounded-md border border-white/15 px-6 py-3.5 text-sm font-medium text-slate-soft transition-colors hover:border-white/30 hover:text-white"
          >
            Book a Consultation
          </a>
        </div>

        <div className="mt-20 grid grid-cols-2 divide-x divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10 bg-ink-700 sm:grid-cols-4 sm:divide-y-0">
          {stats.map((stat) => (
            <div key={stat.label} className="px-6 py-7">
              <div className="font-serif text-3xl font-bold text-slate-light">{stat.value}</div>
              <div className="mt-1.5 text-xs font-medium tracking-wide text-slate-muted">
                {stat.label.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
