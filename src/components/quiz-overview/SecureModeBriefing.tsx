import { Container } from '../atoms/Container';
import { SectionLabel } from '../landing/SectionPrimitives';

const RULES = [
  {
    title: 'Stay in fullscreen mode',
    desc:  'The test launches in fullscreen. Exiting counts as a violation.',
  },
  {
    title: 'No tab or window switching',
    desc:  'The browser detects tab changes. Switching away counts as a violation.',
  },
  {
    title: 'No copy or paste',
    desc:  'Clipboard operations are blocked. Attempts are logged.',
  },
  {
    title: 'No external help',
    desc:  'AI tools, search, second devices — all defeat the purpose. Honor system + tech detection.',
  },
];

/**
 * Pre-test integrity briefing.
 * Lists the 4 rules of Secure Mode. Bold consequence callout below.
 * Each rule: terminal-styled "◆" marker + title + description.
 */
export function SecureModeBriefing() {
  return (
    <section className="py-16 sm:py-24 border-b border-bg-3">
      <Container size="app">
        <SectionLabel>before-you-begin</SectionLabel>
        <h2 className="
          mt-4 font-display font-black text-fg-0
          text-[1.75rem] leading-[1.1] tracking-[-0.03em]
          sm:text-[2.25rem] sm:leading-[1.05]
          max-w-[40rem]
        ">
          This quiz uses <span className="text-term-glow">Secure Mode.</span>
        </h2>
        <p className="
          mt-4 font-mono text-sm sm:text-base text-fg-3 leading-relaxed
          max-w-[40rem]
        ">
          <span className="text-fg-5">// </span>
          By starting, you agree to take this quiz under the following conditions.
          Browser-based anti-cheat is active throughout.
        </p>

        {/* Rules list — tiled hairline borders */}
        <ul className="mt-10 sm:mt-12 grid grid-cols-1 md:grid-cols-2 gap-px bg-bg-3 border border-bg-3">
          {RULES.map((rule) => (
            <li key={rule.title} className="bg-bg-0 p-5 sm:p-6 flex items-start gap-4">
              <span
                aria-hidden="true"
                className="
                  shrink-0 mt-0.5 font-mono text-base text-term-glow
                  leading-none
                "
              >
                ◆
              </span>
              <div className="min-w-0">
                <h3 className="
                  font-display font-bold text-fg-0
                  text-[15px] leading-snug tracking-[-0.01em]
                ">
                  {rule.title}
                </h3>
                <p className="mt-1.5 font-mono text-xs text-fg-3 leading-relaxed">
                  {rule.desc}
                </p>
              </div>
            </li>
          ))}
        </ul>

        {/* Consequence callout */}
        <div className="
          mt-8 border border-warn-500/30 bg-warn-500/[0.04]
          p-5 sm:p-6
          flex items-start gap-3.5
        ">
          <span
            aria-hidden="true"
            className="shrink-0 mt-0.5 font-mono font-bold text-warn-500 text-base"
          >
            !
          </span>
          <p className="font-mono text-xs sm:text-sm text-warn-500 leading-relaxed">
            <span className="font-medium">3 violations will auto-submit your attempt.</span>{' '}
            <span className="text-warn-500/70">
              Your certificate hash includes a record of your integrity score.
              Recruiters can verify how cleanly the test was completed.
            </span>
          </p>
        </div>
      </Container>
    </section>
  );
}
