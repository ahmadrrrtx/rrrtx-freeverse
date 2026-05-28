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
 *   2. StatStrip     — 15 / 1,500 / 80% / $0
 *   3. HowItWorks    — 3 numbered steps
 *   4. QuizGrid      — real 15 quizzes from QUIZ_CATALOG with category filter
 *   5. WhyThis       — 5 differentiators
 *   6. FinalCTA      — closing call-to-action
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
