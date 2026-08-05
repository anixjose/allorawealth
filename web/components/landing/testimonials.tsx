import { SectionEyebrow } from './hex-logo';

const testimonials = [
  {
    quote:
      "Allora Wealth turned our family inheritance into a structured, growing legacy. The transparency and communication are unlike any firm we've worked with.",
    initials: 'MO',
    name: 'Margaret Okonkwo',
    title: 'Founder, Okonkwo Holdings',
  },
  {
    quote:
      'In 4 years with Allora, my portfolio has grown 63%. More importantly, I sleep well — they genuinely protect the downside.',
    initials: 'JH',
    name: 'James Hartwell',
    title: 'Retired CFO, Harrington Group',
  },
  {
    quote:
      'I interviewed six firms before choosing Allora. The clarity of their strategy and the depth of their analysis made the decision simple.',
    initials: 'PN',
    name: 'Priya Nair',
    title: 'Partner, Nair Ventures',
  },
];

export function Testimonials() {
  return (
    <section id="client-stories" className="bg-ink-800 py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <SectionEyebrow>CLIENT STORIES</SectionEyebrow>
        <h2 className="mt-4 font-serif text-4xl font-bold leading-tight text-white sm:text-5xl">
          Wealth built on trust.
        </h2>

        <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {testimonials.map((t) => (
            <figure key={t.name} className="rounded-xl border border-white/10 bg-ink-700 p-7">
              <blockquote className="text-sm leading-relaxed text-slate-soft">&ldquo;{t.quote}&rdquo;</blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-500/15 text-xs font-semibold text-gold-400">
                  {t.initials}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-white">{t.name}</span>
                  <span className="block text-xs text-slate-muted">{t.title}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
