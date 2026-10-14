import { Link } from 'react-router-dom';
import { PageShell } from '../components/layout/PageShell';
import { Container } from '../components/atoms/Container';
import { Button } from '../components/atoms/Button';
import { SectionLabel, SectionHeading } from '../components/landing/SectionPrimitives';
import { CATALOG_TOTALS, topicsWithLengthHeuristicRisk, topicsUnderQualityReview } from '../data/quizMeta';
import { CREDENTIAL_DISCLOSURE } from '../../shared/levels';

/**
 * /about — what this is, how it works, and what it does not prove.
 *
 * Every number on this page is read from the generated catalog, the
 * manifest or the measured quality report — nothing is asserted that the
 * repository cannot show you.
 */
export function About() {
  const underReview = topicsUnderQualityReview().length;
  const risky = topicsWithLengthHeuristicRisk().length;

  return (
    <PageShell>
      <Container size="app">
        <div className="py-12 sm:py-20 space-y-20 sm:space-y-28">
          {/* HERO */}
          <section>
            <div className="font-mono text-[11px] uppercase tracking-widest text-fg-4">
              <span className="text-fg-5">// </span>about
            </div>
            <h1 className="mt-4 font-display font-black text-fg-0 text-[2.5rem] leading-[1] tracking-[-0.04em] sm:text-[3.5rem] lg:text-[5rem] lg:leading-[0.95] lg:tracking-[-0.045em] max-w-[22ch]">
              A free credential <span className="text-term-glow">you can actually check.</span>
            </h1>
            <p className="mt-8 font-mono text-fg-2 leading-relaxed text-base sm:text-lg max-w-[42rem]">
              <span className="text-fg-5">// </span>
              No paywall, no upsell, no &ldquo;premium tier&rdquo;, no account. What this project does insist on is
              being honest about its own limits: every credential page states exactly what was measured, how it was
              measured, and what it therefore does not prove.
            </p>
          </section>

          {/* STATS */}
          <section>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-bg-3 border border-bg-3">
              {STATS.map((s) => (
                <div key={s.label} className="bg-bg-0 p-5 sm:p-6">
                  <div className="font-display font-black text-fg-0 text-3xl sm:text-4xl leading-none tracking-[-0.03em]">
                    {s.value}
                  </div>
                  <div className="mt-2 font-mono text-[11px] uppercase tracking-widest text-fg-4">{s.label}</div>
                  <p className="mt-3 font-mono text-xs text-fg-3 leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* WHY */}
          <section>
            <SectionLabel>why</SectionLabel>
            <SectionHeading>
              Where the catch <span className="text-term-glow">usually is.</span>
            </SectionHeading>
            <ul className="mt-10">
              {PROBLEMS.map((p) => (
                <li key={p.title} className="grid grid-cols-[auto_1fr] gap-x-5 sm:gap-x-7 py-5 sm:py-6 border-t border-bg-3 first:border-t-0">
                  <span
                    aria-hidden="true"
                    className="flex h-7 w-7 items-center justify-center mt-0.5 border border-err-500/40 bg-err-500/10 font-mono text-xs text-err-500"
                  >
                    ✗
                  </span>
                  <div>
                    <h3 className="font-display font-bold text-fg-0 text-base sm:text-lg leading-snug tracking-[-0.01em]">
                      {p.title}
                    </h3>
                    <p className="mt-2 font-mono text-sm text-fg-3 leading-relaxed">{p.body}</p>
                  </div>
                </li>
              ))}
              <li className="grid grid-cols-[auto_1fr] gap-x-5 sm:gap-x-7 py-5 sm:py-6 border-t border-term-glow/30">
                <span
                  aria-hidden="true"
                  className="flex h-7 w-7 items-center justify-center mt-0.5 border border-term-glow/40 bg-term-soft font-mono text-xs text-term-glow"
                >
                  ✓
                </span>
                <div>
                  <h3 className="font-display font-bold text-fg-0 text-base sm:text-lg leading-snug tracking-[-0.01em]">
                    RRRTX FreeVerse
                  </h3>
                  <p className="mt-2 font-mono text-sm text-fg-2 leading-relaxed">
                    Free to take, free to retake, no card anywhere in the flow. Pass, and the server issues a signed
                    credential that any third party can verify — and revoke — against a registry you can read. The
                    weaknesses are published next to the results.
                  </p>
                </div>
              </li>
            </ul>
          </section>

          {/* HOW THIS WORKS */}
          <section>
            <SectionLabel>how-this-works</SectionLabel>
            <SectionHeading>
              The lifecycle, <span className="text-term-glow">end to end.</span>
            </SectionHeading>
            <ol className="mt-10 space-y-6 font-mono text-sm text-fg-3 leading-relaxed max-w-[46rem]">
              <li>
                <span className="text-fg-5">01 · </span>
                <span className="text-fg-1">The server draws the items.</span> Your browser asks for an attempt; the
                server picks the questions from a sealed bank by blueprint, shuffles the options for that attempt and
                signs an attempt token that expires when the timer runs out.
              </li>
              <li>
                <span className="text-fg-5">02 · </span>
                <span className="text-fg-1">Grading happens on the server.</span> Answer keys and explanations never
                enter the bundle. Your browser sends the options you chose; the server decides the score, the pass or
                fail, and how much per-question feedback to disclose.
              </li>
              <li>
                <span className="text-fg-5">03 · </span>
                <span className="text-fg-1">Issuance requires a passing, server-signed result.</span> The credential id
                is derived from the attempt itself, so a retry resolves to the same credential instead of creating a
                second one, and the registry write can only ever create — never overwrite.
              </li>
              <li>
                <span className="text-fg-5">04 · </span>
                <span className="text-fg-1">Verification re-checks everything it can.</span> The record&rsquo;s Ed25519
                signature is verified against the published issuer key, the revocation list is read on every lookup, and
                an unreachable registry is reported as an outage — never as &ldquo;valid&rdquo;.
              </li>
            </ol>
            <div className="mt-10">
              <Link to="/verify">
                <Button variant="ghost" size="md" cmd>
                  try-verification →
                </Button>
              </Link>
            </div>
          </section>

          {/* STACK */}
          <section>
            <SectionLabel>stack</SectionLabel>
            <SectionHeading>
              How it is <span className="text-term-glow">built.</span>
            </SectionHeading>
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-px bg-bg-3 border border-bg-3">
              {STACK.map((item) => (
                <div key={item.tag} className="bg-bg-0 p-5 sm:p-6">
                  <div className="font-mono text-[11px] uppercase tracking-widest text-term-glow">
                    <span className="text-fg-5">// </span>
                    {item.tag}
                  </div>
                  <h3 className="mt-3 font-display font-bold text-fg-0 text-base leading-snug tracking-[-0.01em]">
                    {item.title}
                  </h3>
                  <p className="mt-2 font-mono text-xs text-fg-3 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* LIMITS */}
          <section>
            <SectionLabel>limits</SectionLabel>
            <SectionHeading>
              What it is <span className="text-err-500">not.</span>
            </SectionHeading>
            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-px bg-bg-3 border border-bg-3">
              {limits(underReview, risky).map((limit) => (
                <div key={limit.title} className="bg-bg-0 p-5 sm:p-6">
                  <h3 className="font-display font-bold text-fg-0 text-base leading-snug tracking-[-0.01em]">
                    {limit.title}
                  </h3>
                  <p className="mt-2 font-mono text-xs text-fg-3 leading-relaxed">{limit.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* FOUNDER */}
          <section>
            <SectionLabel>who</SectionLabel>
            <SectionHeading>
              Built by <span className="text-term-glow">one person.</span>
            </SectionHeading>
            <p className="mt-6 font-mono text-sm sm:text-base text-fg-3 leading-relaxed max-w-[44rem]">
              Hi, I&rsquo;m Muhammad Ahmad — an AI developer and automation engineer from Chiniot, Pakistan. I built this
              because every &ldquo;free certification&rdquo; I found had a catch at the moment it mattered most, and
              because a certificate you cannot check is decoration.
            </p>
            <p className="mt-4 font-mono text-sm sm:text-base text-fg-3 leading-relaxed max-w-[44rem]">
              The whole stack is open source: the grading service, the signing code, the registry client, the item-bank
              metadata, the quality report and the rewrite queue. The one thing that is not public is the answer key and
              the sealing material — for obvious reasons.
            </p>

            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-px bg-bg-3 border border-bg-3">
              {LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="group bg-bg-0 hover:bg-bg-1 p-5 sm:p-6 transition-colors"
                >
                  <div className="font-mono text-[11px] uppercase tracking-widest text-fg-4">
                    <span className="text-fg-5">// </span>
                    {link.tag}
                  </div>
                  <div className="mt-2 font-mono text-sm text-term-glow group-hover:underline break-all">
                    {link.label}
                  </div>
                </a>
              ))}
            </div>

            <p className="mt-8 font-mono text-xs text-fg-4 leading-relaxed max-w-[44rem]">
              <span className="text-fg-5">// </span>
              {CREDENTIAL_DISCLOSURE.issuerLegalLine} {CREDENTIAL_DISCLOSURE.accreditation}
            </p>
          </section>

          <section className="border-t border-bg-3 pt-10">
            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/">
                <Button variant="primary" size="lg" cmd>
                  browse-assessments →
                </Button>
              </Link>
              <Link to="/verify">
                <Button variant="ghost" size="lg" cmd>
                  verify-a-credential
                </Button>
              </Link>
            </div>
          </section>
        </div>
      </Container>
    </PageShell>
  );
}

// ─────────────────────────────────────────────────────────
// Data — every value is derived from the generated catalog
// ─────────────────────────────────────────────────────────

const STATS = [
  {
    value: String(CATALOG_TOTALS.topics),
    label: 'skill assessments',
    body: 'AI, web development, programming, data, security, design and modern career skills — each with its own published item-quality status.',
  },
  {
    value: CATALOG_TOTALS.questions.toLocaleString('en-US'),
    label: 'questions in the bank',
    body: `${CATALOG_TOTALS.approvedItems} have passed every automated quality check and ${CATALOG_TOTALS.provisionalItems} are served but queued for a human rewrite. The numbers are published, not estimated.`,
  },
  {
    value: `${CATALOG_TOTALS.levels} levels`,
    label: 'per topic',
    body: 'Foundation and Intermediate are open for every topic; Advanced opens where the reviewed item pool covers its blueprint — and tells you which skill areas are still missing.',
  },
  {
    value: '$0',
    label: 'paywall',
    body: 'No card, no upsell, no premium tier, no account. The pass mark is the only gate.',
  },
];

const PROBLEMS = [
  {
    title: 'The paywall at the finish line.',
    body: 'The course is free until the moment you want proof of it. Charging for a credential is a legitimate business — doing it after the work is done, without saying so up front, is not.',
  },
  {
    title: 'A certificate nobody can check.',
    body: 'A PDF is a picture. If there is no way for a third party to look it up and confirm it is still valid — and not revoked — then it is decoration.',
  },
  {
    title: 'Claims the project cannot support.',
    body: '“Accredited”, “employer-recognised”, “expert-level”, “uncheatable”. A twenty-question multiple-choice test taken at home without proctoring cannot support any of those words.',
  },
];

const STACK = [
  {
    tag: 'client',
    title: 'Static Vite + React app',
    body: 'The browser renders the assessment and collects your choices. It never holds an answer key, never computes a score and never decides whether you passed.',
  },
  {
    tag: 'items',
    title: 'Sealed item bank on the server',
    body: 'Items are sealed with a keyed commitment over each answer and an encrypted explanation. The build refuses to ship a topic whose seal does not verify, and the bundle check fails if answer data ever appears in the client output.',
  },
  {
    tag: 'grading',
    title: 'Server-authoritative grading',
    body: 'A signed attempt token binds the items, the deadline and the recipient. Grading recomputes the score from the private key, applies the pass mark for the level, and decides what feedback to disclose.',
  },
  {
    tag: 'crypto',
    title: 'Ed25519-signed records',
    body: 'The credential record is signed over its canonical JSON with an Ed25519 key held server-side; the public key is published so anyone can verify the signature offline.',
  },
  {
    tag: 'registry',
    title: 'Public registry with revocation',
    body: 'Records live in a public GitHub repository, one JSON file per credential, created once and never overwritten. A revocation list is checked on every verification.',
  },
  {
    tag: 'privacy',
    title: 'Minimal, pseudonymous storage',
    body: 'The credential holds your display name and a salted pseudonymous reference — never your email address. Retake history lives in a pseudonymous file capped at 25 entries.',
  },
];

function limits(underReview: number, risky: number) {
  return [
    {
      title: 'Not an accredited qualification.',
      body: `${CREDENTIAL_DISCLOSURE.accreditation} It is a record that you passed a specific assessment on a specific date.`,
    },
    {
      title: 'Not proctored.',
      body: 'Secure Mode records browser signals — fullscreen exits and tab switches — and those are self-reported by the browser. It cannot see a second device, a second monitor or a screenshot. Nobody is accused automatically; a human reviews any flag.',
    },
    {
      title: 'Item quality is still being raised.',
      body: `${underReview} of ${CATALOG_TOTALS.topics} topic banks are marked under review, and in ${risky} of them a "pick the longest option" strategy alone would still clear the pass mark. That measurement is published on the assessment page with the rewrite queue.`,
    },
    {
      title: 'Identity is self-declared.',
      body: `${CREDENTIAL_DISCLOSURE.identity} A credential proves that a passing attempt happened; it does not prove who was sitting there.`,
    },
    {
      title: 'Not psychometrically calibrated.',
      body: 'Items are not normed, equated or calibrated with item-response theory, and levels are item-selection tiers rather than validated competence bands. The score is the share of items you answered correctly — nothing more.',
    },
    {
      title: 'Multiple-choice only.',
      body: 'Recognising a correct answer is not the same as producing one. Use a credential here as one signal among many, never as the only one.',
    },
  ];
}

const LINKS = [
  { tag: 'github', label: '@ahmadrrrtx', href: 'https://github.com/ahmadrrrtx' },
  { tag: 'linkedin', label: 'linkedin.com/in/ahmadrrrtx', href: 'https://www.linkedin.com/in/ahmadrrrtx' },
  { tag: 'twitter / x', label: '@ahmad_rrrtx', href: 'https://x.com/ahmad_rrrtx' },
  { tag: 'portfolio', label: 'ahmad-multi-verse.lovable.app', href: 'https://ahmad-multi-verse.lovable.app' },
];
