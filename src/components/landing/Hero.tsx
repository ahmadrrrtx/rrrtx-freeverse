import { useNavigate } from 'react-router-dom';
import { Button } from '../atoms/Button';
import { Container } from '../atoms/Container';
import { PreHero } from './PreHero';

/**
 * Hero — top section of the landing page.
 * Editorial-scale headline (up to 128px on desktop), left-aligned, terminal-styled pre-hero.
 * Generous breathing room. Never centered.
 */
export function Hero() {
  const navigate = useNavigate();

  return (
    <section className="relative pt-12 pb-20 sm:pt-20 sm:pb-28 lg:pt-28 lg:pb-36">
      {/* Subtle ambient glow in the top-right corner (very low opacity) */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none absolute top-0 right-0
          h-[480px] w-[480px] -translate-y-1/4 translate-x-1/4
          rounded-full
          bg-[radial-gradient(circle,rgba(0,230,118,0.06)_0%,transparent_60%)]
          motion-reduce:hidden
        "
      />

      <Container size="marketing">
        <div className="relative">
          <PreHero />

          <h1
            className="
              font-display font-black
              text-[14vw] leading-[0.92] tracking-[-0.045em]
              sm:text-[10vw] sm:leading-[0.9]
              lg:text-[8.5rem] lg:leading-[0.88] lg:tracking-[-0.05em]
              text-fg-0
              max-w-[1100px]
            "
          >
            Skills you earned.<br />
            Certs you <span className="text-term-glow">own.</span>
            <sup
              aria-hidden="true"
              className="
                font-mono font-normal align-super
                ml-2 text-[0.32em] text-fg-5
              "
            >
              ^1.0
            </sup>
          </h1>

          <p
            className="
              mt-8 sm:mt-10 lg:mt-12
              max-w-[36rem]
              text-sm sm:text-base lg:text-lg
              text-fg-3 leading-relaxed
            "
          >
            15 certifications. <span className="text-fg-1 font-medium">1,500 hand-written questions.</span>{' '}
            Cryptographically verifiable. Stored on GitHub forever.{' '}
            <span className="text-fg-1 font-medium">Zero paywall.</span> Zero upsell. Zero "premium tier."
          </p>

          <div className="
            mt-10 sm:mt-12
            flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4
          ">
            <Button
              variant="primary"
              size="lg"
              cmd
              onClick={() => {
                document.getElementById('quizzes')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              start-quiz →
            </Button>
            <Button
              variant="ghost"
              size="lg"
              cmd
              onClick={() => navigate('/verify')}
            >
              verify-cert
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
