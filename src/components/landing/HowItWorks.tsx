import { Container } from '../atoms/Container';
import { SectionLabel, SectionHeading } from './SectionPrimitives';

interface Step {
  num: string;
  title: string;
  desc: string;
}

const STEPS: Step[] = [
  {
    num: '01',
    title: 'Pick a quiz',
    desc: '15 topics across AI, web, data, design, security, automation. Each test written from scratch — no AI slop, no recycled bank.',
  },
  {
    num: '02',
    title: 'Pass with 80%',
    desc: '20 questions pulled randomly from a pool of 100 per topic. Secure Mode active throughout — fullscreen, tab-lock, anti-cheat.',
  },
  {
    num: '03',
    title: 'Own the cert',
    desc: 'Download PDF. Share the link. Cryptographically verifiable + recorded in a public GitHub registry. Yours forever.',
  },
];

/**
 * HowItWorks — 3 numbered steps in a tiled grid.
 * Massive Satoshi step numbers (terminal green), then heading + description.
 * On mobile: stacked vertically with top-borders.
 * On desktop: 3 columns with right-borders.
 */
export function HowItWorks() {
  return (
    <section className="py-24 sm:py-32 border-b border-bg-3">
      <Container size="marketing">
        <SectionLabel>how-it-works</SectionLabel>
        <SectionHeading>
          Three steps. <span className="text-term-glow">No catch.</span>
        </SectionHeading>

        <div className="mt-16 sm:mt-20 grid grid-cols-1 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <div
              key={step.num}
              className={`
                py-10 first:pt-0 last:pb-0
                border-t border-bg-3 first:border-t-0
                md:py-0 md:px-10 first:md:px-0 last:md:pr-0
                md:border-t-0 md:border-r md:last:border-r-0
                ${i === 0 ? 'md:pl-0' : ''}
              `}
            >
              <div className="
                font-display font-black text-term-glow
                text-[3.5rem] leading-none tracking-[-0.04em]
                sm:text-[4.5rem]
              ">
                {step.num}
              </div>
              <h3 className="
                mt-6 font-display font-bold text-fg-0
                text-xl sm:text-2xl tracking-[-0.015em]
              ">
                {step.title}
              </h3>
              <p className="
                mt-3 font-mono text-sm text-fg-3 leading-relaxed
                max-w-[28rem]
              ">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
