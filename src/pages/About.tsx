import { Link } from 'react-router-dom';
import { PageShell } from '../components/layout/PageShell';
import { Container } from '../components/atoms/Container';
import { Button } from '../components/atoms/Button';
import { SectionLabel, SectionHeading } from '../components/landing/SectionPrimitives';

/**
 * /about — Honest manifesto.
 * Why this exists, who built it, what it is and isn't.
 * Direct, opinionated voice. No corporate-speak.
 */
export function About() {
  return (
    <PageShell>
      <Container size="app">
        <div className="py-12 sm:py-20 space-y-20 sm:space-y-28">

          {/* HERO */}
          <section>
            <div className="font-mono text-[11px] uppercase tracking-widest text-fg-4">
              <span className="text-fg-5">// </span>about
            </div>
            <h1 className="
              mt-4 font-display font-black text-fg-0
              text-[2.5rem] leading-[1] tracking-[-0.04em]
              sm:text-[3.5rem]
              lg:text-[5rem] lg:leading-[0.95] lg:tracking-[-0.045em]
              max-w-[22ch]
            ">
              A free credential <span className="text-term-glow">that means something.</span>
            </h1>
            <p className="
              mt-8 font-mono text-fg-2 leading-relaxed
              text-base sm:text-lg
              max-w-[40rem]
            ">
              Every certification platform on the internet has a catch — a paywall,
              an upsell, a "premium" tier, a hidden cost at the moment you've already done the work.{' '}
              <span className="text-term-glow">This one doesn't.</span>
            </p>
          </section>

          {/* WHAT THIS IS */}
          <section>
            <SectionLabel>what-this-is</SectionLabel>
            <SectionHeading>
              A real test. <span className="text-term-glow">A real cert.</span> No catch.
            </SectionHeading>
            <p className="mt-6 font-mono text-sm sm:text-base text-fg-3 leading-relaxed max-w-[44rem]">
              RRRTX FreeVerse is 15 skill certifications across AI, web development, programming,
              data, security, design, and modern career skills. Each has a pool of 100 hand-written
              questions. You take 20 in 20 minutes under Secure Mode (full-screen, anti-cheat,
              tab-lock). Pass with 80%+ and you get a cryptographically verifiable certificate
              published to a public GitHub registry — forever.
            </p>
            <div className="
              mt-10 grid grid-cols-1 sm:grid-cols-2
              gap-px bg-bg-3 border border-bg-3
            ">
              {STATS.map((s) => (
                <div key={s.label} className="bg-bg-0 p-5 sm:p-6">
                  <div className="font-display font-black text-fg-0 text-3xl sm:text-4xl leading-none tracking-[-0.03em]">
                    {s.value}
                  </div>
                  <div className="mt-2 font-mono text-[11px] uppercase tracking-widest text-fg-4">
                    {s.label}
                  </div>
                  <p className="mt-3 font-mono text-xs text-fg-3 leading-relaxed">
                    {s.body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* WHY */}
          <section>
            <SectionLabel>why</SectionLabel>
            <SectionHeading>
              The problem with <span className="text-term-glow">other platforms.</span>
            </SectionHeading>
            <ul className="mt-10">
              {PROBLEMS.map((p) => (
                <li
                  key={p.platform}
                  className="
                    grid grid-cols-[auto_1fr] gap-x-5 sm:gap-x-7
                    py-5 sm:py-6
                    border-t border-bg-3 first:border-t-0
                  "
                >
                  <span
                    aria-hidden="true"
                    className="
                      flex h-7 w-7 items-center justify-center mt-0.5
                      border border-err-500/40 bg-err-500/10
                      font-mono text-xs text-err-500
                    "
                  >
                    ✗
                  </span>
                  <div>
                    <h3 className="font-display font-bold text-fg-0 text-base sm:text-lg leading-snug tracking-[-0.01em]">
                      {p.platform}
                    </h3>
                    <p className="mt-2 font-mono text-sm text-fg-3 leading-relaxed">
                      {p.problem}
                    </p>
                  </div>
                </li>
              ))}
              <li className="
                grid grid-cols-[auto_1fr] gap-x-5 sm:gap-x-7
                py-5 sm:py-6 border-t border-term-glow/30
              ">
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
                  <h3 className="font-display font-bold text-fg-0 text-base sm:text-lg leading-snug tracking-[-0.01em]">
                    RRRTX FreeVerse
                  </h3>
                  <p className="mt-2 font-mono text-sm text-fg-2 leading-relaxed">
                    Take the test. Pass. Get the cert. Done. The only paywall is the 80% pass mark.
                    Forever free, open source, and cryptographically verifiable.
                  </p>
                </div>
              </li>
            </ul>
          </section>

          {/* HOW THIS WORKS */}
          <section>
            <SectionLabel>how-it-actually-works</SectionLabel>
            <SectionHeading>The technical guts.</SectionHeading>
            <div className="
              mt-10 grid grid-cols-1 md:grid-cols-2
              gap-px bg-bg-3 border border-bg-3
            ">
              {STACK.map((item) => (
                <div key={item.title} className="bg-bg-0 p-5 sm:p-6">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-term-glow mb-2">
                    {item.tag}
                  </div>
                  <h3 className="font-display font-bold text-fg-0 text-base leading-tight tracking-[-0.01em]">
                    {item.title}
                  </h3>
                  <p className="mt-2.5 font-mono text-xs text-fg-3 leading-relaxed">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* HONEST LIMITS */}
          <section>
            <SectionLabel>honest-limits</SectionLabel>
            <SectionHeading>
              What this <span className="text-warn-500">is not.</span>
            </SectionHeading>
            <p className="mt-6 font-mono text-sm sm:text-base text-fg-3 leading-relaxed max-w-[40rem]">
              Honesty matters more than marketing. Here's what RRRTX FreeVerse isn't trying to be:
            </p>
            <div className="mt-8 space-y-4">
              {LIMITS.map((l) => (
                <div
                  key={l.title}
                  className="border border-warn-500/20 bg-warn-500/[0.03] p-5"
                >
                  <h3 className="font-display font-bold text-fg-0 text-base leading-tight">
                    {l.title}
                  </h3>
                  <p className="mt-2 font-mono text-xs text-fg-3 leading-relaxed">
                    {l.body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* WHO */}
          <section>
            <SectionLabel>who</SectionLabel>
            <SectionHeading>
              Built by <span className="text-term-glow">Ahmad.</span>
            </SectionHeading>
            <p className="mt-6 font-mono text-sm sm:text-base text-fg-3 leading-relaxed max-w-[44rem]">
              Hi, I'm Muhammad Ahmad — an AI developer and automation engineer from Chiniot, Pakistan.
              I built this because every "free certification" I found had a catch when it mattered most.
              I wanted something that just <span className="text-fg-1">worked</span> — for me, for my friends,
              for anyone learning anywhere.
            </p>
            <p className="mt-4 font-mono text-sm sm:text-base text-fg-3 leading-relaxed max-w-[44rem]">
              The whole stack is open source — fork it, run your own, build on top of it.
              The 1,500 questions, the secure mode logic, the cryptographic cert system,
              the GitHub registry — all of it is public on my GitHub.
            </p>

            <div className="
              mt-10 grid grid-cols-1 sm:grid-cols-2
              gap-px bg-bg-3 border border-bg-3
            ">
              {LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="
                    bg-bg-0 hover:bg-bg-1
                    p-5 sm:p-6 flex items-center justify-between gap-4
                    transition-colors duration-snap group
                  "
                >
                  <div className="min-w-0">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-fg-4 mb-1.5">
                      {link.tag}
                    </div>
                    <div className="font-display font-bold text-fg-0 text-base leading-tight truncate group-hover:text-term-glow transition-colors duration-snap">
                      {link.label}
                    </div>
                  </div>
                  <span
                    aria-hidden="true"
                    className="
                      text-fg-5 text-lg shrink-0
                      transition-all duration-fast
                      group-hover:text-term-glow group-hover:translate-x-1
                    "
                  >
                    →
                  </span>
                </a>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="border-t border-bg-3 pt-16 sm:pt-20">
            <h2 className="
              font-display font-black text-fg-0
              text-3xl sm:text-4xl lg:text-5xl
              leading-tight tracking-[-0.035em] max-w-[20ch]
            ">
              Earn one. <span className="text-term-glow">It's free.</span>
            </h2>
            <p className="mt-5 font-mono text-sm sm:text-base text-fg-3 max-w-md">
              <span className="text-fg-5">// </span>
              twenty minutes from now you could have a real, verifiable credential.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Link to="/">
                <Button variant="primary" size="lg" cmd>start-a-quiz →</Button>
              </Link>
              <Link to="/verify">
                <Button variant="ghost" size="lg" cmd>verify-a-cert</Button>
              </Link>
            </div>
          </section>

        </div>
      </Container>
    </PageShell>
  );
}

// ─────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────

const STATS = [
  {
    value: '15',
    label: 'certifications',
    body: 'AI, web dev, programming, data, design, security, modern career skills.',
  },
  {
    value: '1,500',
    label: 'hand-written questions',
    body: '100 per topic. Each test draws 20 randomly. Every attempt is unique.',
  },
  {
    value: '80%',
    label: 'to pass',
    body: 'Same standard for everyone. No tiers, no easy mode, no skill levels.',
  },
  {
    value: '$0',
    label: 'forever',
    body: 'No paywall, no upsell, no premium tier. The cert is the deliverable, not the upsell.',
  },
];

const PROBLEMS = [
  {
    platform: 'Coursera',
    problem: '$49/month — and the "certificate" is paywalled separately. Free audit doesn\'t include the cert.',
  },
  {
    platform: 'Alison',
    problem: '€20-€50 per cert. The course is free, but the only proof you completed it costs real money — discovered after you finish the work.',
  },
  {
    platform: 'CodeAlpha',
    problem: 'Asks for ₹500 after you submit your final task. Branded as a "free internship" until the moment you want the certificate.',
  },
  {
    platform: 'Simplilearn / SkillUp',
    problem: 'Free certs, but the entire platform is a lead funnel for $1,000+ bootcamps. You\'re the product.',
  },
];

const STACK = [
  {
    tag: 'frontend',
    title: 'Static site on Vercel',
    body: 'Vite + React + TypeScript + Tailwind. No backend server. The entire app is static files. 80KB initial bundle.',
  },
  {
    tag: 'questions',
    title: 'Versioned JSON in the repo',
    body: '15 quiz files in /src/quizzes. Sub-pool randomization picks 20 of 100 each attempt — virtually unique every time.',
  },
  {
    tag: 'crypto',
    title: 'SHA-256 cert IDs',
    body: 'Cert ID = hash(name + email + quiz + score + date + integrity + secret salt). Tampering with any field breaks the hash. Verifiable from the ID alone.',
  },
  {
    tag: 'registry',
    title: 'Public GitHub repository',
    body: 'Every cert is a JSON file at /certs/YYYY/MM/RFV-...json. Anyone can audit. We can\'t silently revoke or edit.',
  },
  {
    tag: 'security',
    title: 'Browser-level Secure Mode',
    body: 'Full-screen lock, tab-switch detection, copy/paste block, dev-tools detection. Modeled on HackerRank Secure Mode. Integrity is baked into the cert hash.',
  },
  {
    tag: 'storage',
    title: 'localStorage + sessionStorage',
    body: 'Your profile, certs, and quiz history live in your browser. Export/import to sync across devices. Zero user accounts, zero data collection.',
  },
];

const LIMITS = [
  {
    title: 'Not an accredited degree.',
    body: 'This is a skill badge. It demonstrates you passed a real test. It is not equivalent to a university credential or a regulated professional certification.',
  },
  {
    title: 'Not webcam-proctored.',
    body: 'Secure Mode is browser-level (like HackerRank\'s Secure Mode, not their Proctor Mode). We don\'t record your face or screen. Real cheaters with two devices can defeat any browser-only system — including this one.',
  },
  {
    title: 'Not an alternative to deep learning.',
    body: 'Passing a 20-question MCQ test proves you know the topic well enough to recognize correct answers. It doesn\'t replace months of building real things. Use the cert as one signal, not the only one.',
  },
];

const LINKS = [
  {
    tag: 'github',
    label: '@ahmadrrrtx',
    href: 'https://github.com/ahmadrrrtx',
  },
  {
    tag: 'linkedin',
    label: 'linkedin.com/in/ahmadrrrtx',
    href: 'https://www.linkedin.com/in/ahmadrrrtx',
  },
  {
    tag: 'twitter / x',
    label: '@ahmad_rrrtx',
    href: 'https://x.com/ahmad_rrrtx',
  },
  {
    tag: 'portfolio',
    label: 'ahmad-multi-verse.lovable.app',
    href: 'https://ahmad-multi-verse.lovable.app',
  },
];
