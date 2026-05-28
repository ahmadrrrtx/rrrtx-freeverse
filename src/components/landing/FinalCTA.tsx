import { Container } from '../atoms/Container';
import { Button } from '../atoms/Button';

/**
 * FinalCTA — closing call-to-action at the bottom of the landing page.
 * Big Satoshi headline. Single command button. Minimal — confidence move.
 */
export function FinalCTA() {
  return (
    <section className="py-32 sm:py-40">
      <Container size="marketing">
        <div className="max-w-[44rem]">
          <h2 className="
            font-display font-black text-fg-0
            text-[2.5rem] leading-[1.05] tracking-[-0.035em]
            sm:text-[3.5rem]
            lg:text-[5rem] lg:leading-[1] lg:tracking-[-0.045em]
          ">
            Take it.<br/>
            Pass it.<br/>
            <span className="text-term-glow">Own it.</span>
          </h2>

          <p className="mt-8 font-mono text-sm sm:text-base text-fg-3 leading-relaxed max-w-md">
            One quiz. Twenty minutes. A real certificate at the end.
            <br />
            <span className="text-fg-5">// no signup required to start.</span>
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
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
            <a
              href="https://github.com/ahmadrrrtx"
              target="_blank"
              rel="noreferrer noopener"
              className="
                inline-flex items-center justify-center gap-2
                h-13 px-6
                font-mono text-sm text-fg-3
                hover:text-term-glow transition-colors duration-snap
              "
            >
              view source on github →
            </a>
          </div>
        </div>
      </Container>
    </section>
  );
}
