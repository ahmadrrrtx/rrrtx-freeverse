import { Container } from '../atoms/Container';
import { SectionLabel } from '../landing/SectionPrimitives';

const RULES = [
  {
    title: 'Stay in fullscreen',
    desc: 'The attempt opens in fullscreen. Leaving it raises a signal and is recorded.',
  },
  {
    title: 'Keep this tab focused',
    desc: 'Switching tabs or windows raises a signal and is recorded.',
  },
  {
    title: 'Copy and paste are blocked',
    desc: 'Clipboard events on the attempt page are blocked and counted while you are in the player.',
  },
  {
    title: 'Three signals end the attempt',
    desc: 'On the third signal the attempt is submitted as-is and graded without the pass mark being awarded.',
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
          The attempt opens in <span className="text-term-glow">Secure Mode.</span>
        </h2>
        <p className="
          mt-4 font-mono text-sm sm:text-base text-fg-3 leading-relaxed
          max-w-[40rem]
        ">
          <span className="text-fg-5">// </span>
          Secure Mode is a set of browser signals, not proctoring. It cannot see a second device, a second monitor, a
          screenshot tool or a browser extension. What it can do is record when the attempt page loses focus or the
          learner leaves fullscreen, and count those signals — so the honest path is the only comfortable one. The
          signals are marked as self-reported on the record, and nobody is accused automatically: a human reviews any
          flag before it means anything. Here is what is actually monitored:
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
