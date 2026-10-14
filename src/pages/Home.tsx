import { PageShell } from '../components/layout/PageShell';
import { Hero } from '../components/landing/Hero';
import { StatStrip } from '../components/landing/StatStrip';
import { HowItWorks } from '../components/landing/HowItWorks';
import { QuizGrid } from '../components/landing/QuizGrid';
import { WhyThis } from '../components/landing/WhyThis';
import { FinalCTA } from '../components/landing/FinalCTA';

/**
 * RRRTX FreeVerse — Landing page.
 *
 * Composition:
 *   1. Hero          — pre-hero command + 128px headline + 2 CTAs
 *   2. StatStrip     — topics / questions / levels / paywall, from CATALOG_TOTALS
 *   3. HowItWorks    — the four real lifecycle steps (start → server draws →
 *                      server grades → signed credential, verified from the registry)
 *   4. QuizGrid      — the 15 real topics from QUIZ_CATALOG, with availability
 *   5. WhyThis       — what is and is not claimed, and why
 *   6. FinalCTA      — closing call-to-action
 *
 * Every figure on this page is derived from generated catalog data rather
 * than written by hand, so the copy cannot drift from the real bank.
 */
export function Home() {
  return (
    <PageShell showStatus>
      <Hero />
      <StatStrip />
      <HowItWorks />
      <QuizGrid />
      <WhyThis />
      <FinalCTA />
    </PageShell>
  );
}
