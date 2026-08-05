import { LandingNav } from './landing-nav';
import { Hero } from './hero';
import { WhyAllora } from './why-allora';
import { TrackRecord } from './track-record';
import { Testimonials } from './testimonials';
import { FinalCta } from './final-cta';
import { SiteFooter } from './site-footer';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-ink font-sans">
      <LandingNav />
      <Hero />
      <WhyAllora />
      <TrackRecord />
      <Testimonials />
      <FinalCta />
      <SiteFooter />
    </div>
  );
}
