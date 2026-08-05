import { SectionEyebrow } from './hex-logo';

const headlineStats = [
  { label: 'Annualized Return (10Y)', value: '14.7%', sub: 'vs 9.2% benchmark' },
  { label: 'Max Drawdown', value: '-12.4%', sub: 'vs -28.6% benchmark' },
  { label: 'Sharpe Ratio', value: '1.84', sub: 'Top decile' },
];

const yearly = [
  { year: '2024', note: 'AI & tech rebound captured', change: '+17.2%' },
  { year: '2023', note: 'Rate-resilient positioning', change: '+21.8%' },
  { year: '2022', note: 'Minimal drawdown vs peers', change: '-4.1%' },
  { year: '2021', note: 'Recovery fully captured', change: '+19.4%' },
  { year: '2020', note: 'COVID drawdown recovered in Q2', change: '+11.3%' },
];

export function TrackRecord() {
  return (
    <section id="track-record" className="bg-ink py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <SectionEyebrow>TRACK RECORD</SectionEyebrow>
        <h2 className="mt-4 max-w-2xl font-serif text-4xl font-bold leading-tight text-white sm:text-5xl">
          Consistent alpha, every market regime.
        </h2>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-muted">
          Our flagship Balanced Growth strategy has outperformed its benchmark in 10 of the last 12 years — through
          the 2020 correction, 2022 rate shock, and the AI-driven volatility of 2024.
        </p>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {headlineStats.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-white/10 bg-ink-700 p-7">
              <p className="text-xs font-semibold tracking-wide text-slate-muted">{stat.label.toUpperCase()}</p>
              <p className="mt-3 font-serif text-4xl font-bold text-gold-400">{stat.value}</p>
              <p className="mt-1.5 text-sm text-slate-soft">{stat.sub}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 overflow-hidden rounded-xl border border-white/10 bg-ink-700">
          {yearly.map((row, i) => (
            <div
              key={row.year}
              className={`flex items-center justify-between px-7 py-5 ${i !== yearly.length - 1 ? 'border-b border-white/10' : ''}`}
            >
              <div className="flex items-center gap-6">
                <span className="w-12 font-serif text-lg font-bold text-slate-light">{row.year}</span>
                <span className="text-sm text-slate-muted">{row.note}</span>
              </div>
              <span className={`font-serif text-lg font-bold ${row.change.startsWith('-') ? 'text-red-400' : 'text-emerald-400'}`}>
                {row.change}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
