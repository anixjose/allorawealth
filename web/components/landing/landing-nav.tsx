import Link from 'next/link';
import { VideoLogoChip } from './video-logo-chip';

const navLinks = [
  { href: '#why-allora', label: 'Services' },
  { href: '#track-record', label: 'Performance' },
  { href: '#client-stories', label: 'About' },
  { href: '#site-footer', label: 'Insights' },
];

export function LandingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-ink/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
        <div className="flex items-center gap-3">
          <VideoLogoChip />
          <div className="leading-tight">
            <div className="font-serif text-xl font-bold text-white">Allora</div>
            <div className="text-[10px] font-semibold tracking-[0.25em] text-slate-soft">WEALTH</div>
          </div>
        </div>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="text-sm text-slate-soft transition-colors hover:text-white">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-5">
          <Link href="/login" className="hidden text-sm text-slate-soft transition-colors hover:text-white sm:block">
            Sign In
          </Link>
          <Link
            href="/register"
            className="rounded-md bg-gold-500 px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-gold-400"
          >
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}
