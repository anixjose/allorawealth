import { Shield, LineChart, RefreshCw, Layers, Globe2, UserCheck } from 'lucide-react';
import { SectionEyebrow } from './hex-logo';

const features = [
  {
    icon: Shield,
    title: 'Capital Protection',
    description:
      'Institutional-grade risk frameworks shield your portfolio through every market cycle, ensuring your wealth is preserved as it grows.',
  },
  {
    icon: LineChart,
    title: 'Smart Portfolio Analytics',
    description:
      'Real-time dashboards with AI-driven insights surface opportunities and rebalancing signals before the market moves.',
  },
  {
    icon: RefreshCw,
    title: 'Compounding Strategies',
    description:
      'Dividend reinvestment, tax-loss harvesting, and systematic rebalancing — automated so your wealth compounds on autopilot.',
  },
  {
    icon: Layers,
    title: 'Diversified Asset Classes',
    description:
      'Access equities, fixed income, real assets, and alternatives — a full spectrum of opportunities tailored to your risk profile.',
  },
  {
    icon: Globe2,
    title: 'Global Market Access',
    description:
      'Invest across 45+ markets worldwide. Capture global growth while your portfolio remains anchored to your home currency.',
  },
  {
    icon: UserCheck,
    title: 'Dedicated Advisor',
    description:
      'Every client is paired with a senior wealth strategist. Quarterly reviews, proactive communication, and always-on support.',
  },
];

export function WhyAllora() {
  return (
    <section id="why-allora" className="bg-ink-800 py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <SectionEyebrow>WHY ALLORA</SectionEyebrow>
        <h2 className="mt-4 max-w-2xl font-serif text-4xl font-bold leading-tight text-white sm:text-5xl">
          Built for lasting wealth, not short-term gains.
        </h2>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-muted">
          We combine rigorous research, institutional-grade tools, and personalized advisory — so every decision
          serves your long-term financial independence.
        </p>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-white/10 bg-ink-700 p-7 transition-colors hover:border-gold-500/30"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gold-500/10">
                <feature.icon className="h-5 w-5 text-gold-400" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-white">{feature.title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-muted">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
