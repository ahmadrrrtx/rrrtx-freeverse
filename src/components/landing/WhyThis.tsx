import { Container } from '../atoms/Container';
import { SectionLabel, SectionHeading, SectionSub } from './SectionPrimitives';

interface Reason {
  title: string;
  body: string;
}

const REASONS: Reason[] = [
  {
    title: 'No paywall, no upsell, no "premium tier."',
    body: 'Take the test. Pass. Get the cert. Done. The only paywall is the 80% pass mark.',
  },
  {
    title: 'Cryptographically verifiable.',
    body: 'Every cert ID is a SHA-256 hash of recipient + score + date + integrity. Anyone can re-verify it.',
  },
  {
    title: 'Open source on GitHub.',
    body: 'Question bank, source code, cert registry — all public. Fork it, audit it, contribute.',
  },
  {
    title: 'Secure Mode anti-cheat.',
    body: 'Fullscreen lock, tab-switch detection, copy/paste block. Integrity is baked into the cert hash.',
  },
  {
    title: 'Written by a human.',
    body: 'Each of the 1,500 questions hand-crafted with sources and reasoning. Not AI-generated slop.',
  },
];

/**
 * WhyThis — the differentiator section.
 * Each row: green ✓ symbol + bold title + body description.
 * Vertical stack with hairline dividers — feels like a feature list in a manifesto.
 */
export function WhyThis() {
  return (
    <section className="py-24 sm:py-32 border-b border-bg-3">
      <Container size="marketing">
        <SectionLabel>why-this-exists</SectionLabel>
        <SectionHeading>
          What makes this <span className="text-term-glow">different.</span>
        </SectionHeading>
        <SectionSub>
          Every other certification platform has a catch. Coursera charges $49/month. Alison charges €20 per cert.
          CodeAlpha asks for ₹500 after you finish the work. We don't do that.
        </SectionSub>

        <ul className="mt-12 sm:mt-16">
          {REASONS.map((r) => (
            <li
              key={r.title}
              className="
                grid grid-cols-[auto_1fr] gap-x-5 sm:gap-x-7
                py-6 sm:py-7
                border-t border-bg-3 first:border-t-0
              "
            >
              <span
                aria-hidden="true"
                className="
                  flex h-7 w-7 items-center justify-center mt-0.5
                  border border-term-glow/40 bg-term-soft
                  font-mono text-xs text-term-glow
                "
              >
                ✓
              </span>
              <div>
                <h3 className="
                  font-display font-bold text-fg-0
                  text-base sm:text-lg leading-snug tracking-[-0.01em]
                ">
                  {r.title}
                </h3>
                <p className="mt-2 font-mono text-sm text-fg-3 leading-relaxed max-w-[36rem]">
                  {r.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
