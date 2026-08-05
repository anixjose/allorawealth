import Link from 'next/link';

export function FinalCta() {
  return (
    <section className="bg-ink py-24">
      <div className="mx-auto max-w-3xl px-6 text-center lg:px-10">
        <h2 className="font-serif text-4xl font-bold leading-tight text-white sm:text-5xl">
          Ready to grow your wealth
          <br />
          with a partner you trust?
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-slate-muted">
          Schedule a complimentary strategy session. No obligations — just clarity on how Allora Wealth can serve
          your financial future.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/register"
            className="rounded-md bg-gold-500 px-6 py-3.5 text-sm font-semibold text-ink transition-colors hover:bg-gold-400"
          >
            Open Your Account
          </Link>
          <a
            href="#site-footer"
            className="rounded-md border border-white/15 px-6 py-3.5 text-sm font-medium text-slate-soft transition-colors hover:border-white/30 hover:text-white"
          >
            Speak with an Advisor
          </a>
        </div>
      </div>
    </section>
  );
}
