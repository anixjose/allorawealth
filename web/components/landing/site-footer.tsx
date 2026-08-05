import { VideoLogoChip } from './video-logo-chip';

const serviceLinks = ['Portfolio Management', 'Wealth Planning', 'Tax Strategy', 'Estate & Trust'];
const companyLinks = ['About Allora', 'Investment Team', 'Insights', 'Careers', 'Contact'];
const legalLinks = ['Privacy', 'Terms', 'Disclosures', 'ADV'];

export function SiteFooter() {
  return (
    <footer id="site-footer" className="border-t border-white/10 bg-ink-800 pt-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="grid grid-cols-1 gap-10 pb-12 sm:grid-cols-3">
          <div>
            <div className="flex items-center gap-3">
              <VideoLogoChip className="h-9 w-9" />
              <div className="leading-tight">
                <div className="font-serif text-lg font-bold text-white">Allora</div>
                <div className="text-[10px] font-semibold tracking-[0.25em] text-slate-soft">WEALTH</div>
              </div>
            </div>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-slate-muted">
              Your Investment Partner. Together, We Build Wealth. Serving private clients since 2012.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-slate-soft">SERVICES</p>
            <ul className="mt-4 space-y-3">
              {serviceLinks.map((link) => (
                <li key={link}>
                  <a href="#why-allora" className="text-sm text-slate-muted transition-colors hover:text-white">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-slate-soft">COMPANY</p>
            <ul className="mt-4 space-y-3">
              {companyLinks.map((link) => (
                <li key={link}>
                  <a href="#client-stories" className="text-sm text-slate-muted transition-colors hover:text-white">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-white/10 py-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-muted">
            © 2026 Allora Wealth Management LLC. All rights reserved. Investment advisory services subject to
            regulatory oversight.
          </p>
          <div className="flex gap-6">
            {legalLinks.map((link) => (
              <a key={link} href="#site-footer" className="text-xs text-slate-muted transition-colors hover:text-white">
                {link}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
