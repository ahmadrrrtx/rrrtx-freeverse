import { Link } from 'react-router-dom';
import { PageShell } from '../components/layout/PageShell';
import { Container } from '../components/atoms/Container';
import { Button } from '../components/atoms/Button';
import { SectionLabel } from '../components/landing/SectionPrimitives';

/**
 * /terms — Terms of Service.
 *
 * Honest, plain-language, no boilerplate.
 * Reflects the actual service: free, no account, no warranty,
 * skill-badge credential (not an accredited degree).
 */
export function Terms() {
  return (
    <PageShell>
      <Container size="prose">
        <article className="py-12 sm:py-20">

          <SectionLabel>legal · terms</SectionLabel>
          <h1 className="
            mt-4 font-display font-black text-fg-0
            text-[2.25rem] leading-[1.05] tracking-[-0.035em]
            sm:text-[3rem] sm:leading-[1]
            lg:text-[3.75rem] lg:tracking-[-0.04em]
            max-w-[24ch]
          ">
            Terms of <span className="text-term-glow">Service.</span>
          </h1>
          <p className="
            mt-5 font-mono text-sm sm:text-base text-fg-3 leading-relaxed
            max-w-[40rem]
          ">
            <span className="text-fg-5">// </span>
            The rules of engagement. Short, fair, written by a human.
          </p>

          {/* META */}
          <div className="mt-10 border border-bg-3 bg-bg-1 divide-y divide-bg-3">
            <MetaRow label="Effective" value="13 May 2026" />
            <MetaRow label="Last updated" value="13 May 2026" />
            <MetaRow label="Operated by" value="Muhammad Ahmad (RRRTX)" />
            <MetaRow label="License" value="MIT (source code)" />
          </div>

          {/* TLDR */}
          <Section title="The 30-second version">
            <ul className="space-y-2.5 font-mono text-sm text-fg-2">
              <ListItem>The service is free. We don't charge you anything, ever.</ListItem>
              <ListItem>You get a skill badge (a certificate of achievement). It is <strong className="text-fg-0">not</strong> an accredited degree or a regulated professional certification.</ListItem>
              <ListItem>Don't cheat. Don't impersonate others. Don't abuse the service.</ListItem>
              <ListItem>The service is provided "as is" with no warranties. Use it at your own risk.</ListItem>
              <ListItem>The source code is open-source under the MIT license — fork it, study it, build on it.</ListItem>
            </ul>
          </Section>

          {/* THE SERVICE */}
          <Section title="01 · What the service is">
            <P>
              RRRTX FreeVerse ("the service") is a free online certification platform. You take a 20-question multiple-choice quiz under a browser-based "Secure Mode" environment. If you score 80% or higher, the service generates a verifiable digital certificate, stores it locally in your browser, and publishes a record to a public GitHub registry.
            </P>
            <P>
              The service is operated by Muhammad Ahmad as an independent project. There is no company, no investor, no monetization model behind it.
            </P>
          </Section>

          {/* ELIGIBILITY */}
          <Section title="02 · Who can use it">
            <P>
              You may use the service if you:
            </P>
            <ul className="mt-3 space-y-2 font-mono text-sm text-fg-2">
              <ListItem>Are at least 13 years old (or 16 if you reside in the European Economic Area).</ListItem>
              <ListItem>Can lawfully enter into a binding agreement in your jurisdiction.</ListItem>
              <ListItem>Provide accurate information for your certificate (your real name, an email you control).</ListItem>
              <ListItem>Agree to follow these terms.</ListItem>
            </ul>
            <P>
              If you're under 18, please get a parent or guardian's permission before earning a certificate.
            </P>
          </Section>

          {/* WHAT THE CERT IS — IMPORTANT */}
          <Section title="03 · What a certificate is (and isn't)">
            <P>
              A RRRTX FreeVerse certificate is a <strong className="text-fg-0">skill badge of achievement</strong>. It demonstrates that you passed a 20-question test on a specific topic with a score of at least 80%, under browser-based anti-cheat conditions.
            </P>
            <P className="text-warn-500">
              <span className="text-warn-500/70">// important: </span>
              A RRRTX FreeVerse certificate is <strong>NOT</strong>:
            </P>
            <ul className="mt-3 space-y-2 font-mono text-sm text-fg-2">
              <ListItem>An accredited academic degree or diploma.</ListItem>
              <ListItem>A regulated professional license (e.g., medical, legal, engineering certifications).</ListItem>
              <ListItem>Equivalent to a certification from organizations like AWS, Google, Microsoft, Cisco, ISACA, ISC2, etc.</ListItem>
              <ListItem>A guarantee of employment, salary, or any specific career outcome.</ListItem>
            </ul>
            <P>
              We make no representation that any third party (employer, university, government agency, etc.) will recognize the certificate. Its value is what you make of it as a portfolio supplement and a public, verifiable proof of effort.
            </P>
          </Section>

          {/* USE OF SERVICE */}
          <Section title="04 · Acceptable use">
            <P>
              You agree that you will <strong className="text-fg-0">not</strong>:
            </P>
            <ul className="mt-3 space-y-2 font-mono text-sm text-fg-2">
              <ListItem>Use the service to earn certificates under a false identity or for someone else.</ListItem>
              <ListItem>Use external tools, second devices, AI assistants, or any other person to answer quiz questions for you (Secure Mode is browser-based — circumventing it defeats the purpose).</ListItem>
              <ListItem>Scrape, harvest, copy, or republish the quiz question bank for commercial purposes.</ListItem>
              <ListItem>Attempt to attack, overload, or disrupt the service (including the certificate-issuing API, the public registry, or the hosting infrastructure).</ListItem>
              <ListItem>Use the service to harass, defame, or impersonate others.</ListItem>
              <ListItem>Misrepresent a RRRTX FreeVerse certificate as an accredited credential.</ListItem>
              <ListItem>Reverse-engineer the certificate ID hashing system to forge certificates.</ListItem>
            </ul>
            <P>
              We reserve the right to revoke certificates obtained in violation of these terms by removing them from the public registry.
            </P>
          </Section>

          {/* INTELLECTUAL PROPERTY */}
          <Section title="05 · Intellectual property">
            <SubSection title="The source code">
              <P>
                The website source code, the certificate generation system, the secure-mode logic, the React components — all of it is licensed under the MIT license. You can fork, modify, and use it commercially. See the GitHub repository for the full license text.
              </P>
            </SubSection>
            <SubSection title="The quiz questions">
              <P>
                All 1,500 quiz questions are hand-written original content authored by Muhammad Ahmad. They are licensed under <strong className="text-fg-0">Creative Commons BY-NC 4.0</strong> — you may share and adapt them for non-commercial use with attribution. Commercial use (e.g., reselling them as part of a paid course) requires explicit permission.
              </P>
            </SubSection>
            <SubSection title="Your certificate">
              <P>
                The certificate issued to you is yours. Download it, share it, frame it, post it on LinkedIn, embed it in your portfolio. The cert ID and registry record are publicly verifiable forever.
              </P>
            </SubSection>
            <SubSection title="The RRRTX brand">
              <P>
                "RRRTX", "RRRTX FreeVerse", and the ◐ mark are trademarks of Muhammad Ahmad. Don't use them to imply endorsement of unrelated products or services.
              </P>
            </SubSection>
          </Section>

          {/* COOLDOWNS */}
          <Section title="06 · Quiz retakes and cooldowns">
            <ul className="mt-3 space-y-2 font-mono text-sm text-fg-2">
              <ListItem>If you <strong className="text-fg-0">fail</strong> a quiz, you may retake it after <strong className="text-fg-0">24 hours</strong>. You will be shown different questions (drawn from the 100-question pool).</ListItem>
              <ListItem>If your attempt is <strong className="text-fg-0">force-submitted</strong> due to Secure Mode violations, the cooldown is <strong className="text-fg-0">7 days</strong>.</ListItem>
              <ListItem>If you <strong className="text-fg-0">pass</strong> a quiz, you may retake it after <strong className="text-fg-0">30 days</strong> to attempt a higher score. The latest passing cert is what shows in your dashboard.</ListItem>
              <ListItem>Cooldowns are enforced client-side in your browser. We don't enforce them server-side because there is no server account.</ListItem>
            </ul>
          </Section>

          {/* DISCLAIMER OF WARRANTY */}
          <Section title="07 · Disclaimer of warranty">
            <P>
              The service is provided <strong className="text-fg-0">"AS IS" and "AS AVAILABLE"</strong>, without warranties of any kind, either express or implied, including but not limited to merchantability, fitness for a particular purpose, accuracy, or non-infringement.
            </P>
            <P>
              While we work hard to ensure the quiz questions are correct and the certificate system is reliable, we do not warrant that:
            </P>
            <ul className="mt-3 space-y-2 font-mono text-sm text-fg-2">
              <ListItem>The service will always be available, uninterrupted, or error-free.</ListItem>
              <ListItem>Every quiz question is perfectly worded or has only one defensible answer.</ListItem>
              <ListItem>Certificates will be universally recognized by employers or institutions.</ListItem>
              <ListItem>The Secure Mode anti-cheat system is impossible to circumvent (browser-based systems have known limits).</ListItem>
              <ListItem>The public GitHub registry will remain available indefinitely (we'll do our best — and the open-source nature means it can be mirrored).</ListItem>
            </ul>
          </Section>

          {/* LIMITATION OF LIABILITY */}
          <Section title="08 · Limitation of liability">
            <P>
              To the maximum extent permitted by law, Muhammad Ahmad and the RRRTX FreeVerse project shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, employment opportunities, or goodwill, arising from or related to your use of the service.
            </P>
            <P>
              You use the service at your own risk. If you rely on a RRRTX FreeVerse certificate for any decision (career, academic, etc.) and it doesn't produce the outcome you wanted, that is not our liability.
            </P>
          </Section>

          {/* CHANGES & TERMINATION */}
          <Section title="09 · Changes and termination">
            <ul className="mt-3 space-y-2 font-mono text-sm text-fg-2">
              <ListItem>We may update these terms. Material changes will be reflected in the "Last updated" date and announced on the project's GitHub repository.</ListItem>
              <ListItem>We may modify, suspend, or discontinue the service at any time, for any reason. If we do, the open-source code means anyone can run their own copy.</ListItem>
              <ListItem>You can stop using the service at any time. There's no account to "close" — just stop visiting the site, and optionally use the "Reset everything" button on the dashboard.</ListItem>
            </ul>
          </Section>

          {/* GOVERNING LAW */}
          <Section title="10 · Governing law">
            <P>
              These terms are governed by the laws of the Islamic Republic of Pakistan. Any disputes will be resolved in the courts of Punjab, Pakistan, unless local consumer-protection laws in your jurisdiction provide otherwise.
            </P>
          </Section>

          {/* CONTACT */}
          <Section title="11 · Contact">
            <P>
              For questions about these terms, email{' '}
              <a href="mailto:ahmadrrrtx333@gmail.com" className="text-term-glow hover:underline underline-offset-4">
                ahmadrrrtx333@gmail.com
              </a>
              {' '}with the subject "Terms".
            </P>
          </Section>

          {/* BACK */}
          <div className="mt-16 sm:mt-20 pt-12 border-t border-bg-3 flex flex-col sm:flex-row gap-3">
            <Link to="/"><Button variant="ghost" size="lg" cmd>back-to-home</Button></Link>
            <Link to="/privacy"><Button variant="ghost" size="lg" cmd>view-privacy-policy</Button></Link>
          </div>

        </article>
      </Container>
    </PageShell>
  );
}

// ─────────────────────────────────────────────────────────
// Helpers (same shape as PrivacyPolicy for visual consistency)
// ─────────────────────────────────────────────────────────

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="
      grid grid-cols-[120px_1fr] sm:grid-cols-[180px_1fr]
      gap-4 sm:gap-6 px-5 sm:px-6 py-3.5 items-baseline
    ">
      <dt className="font-mono text-[11px] uppercase tracking-widest text-fg-4">{label}</dt>
      <dd className="font-mono text-sm text-fg-1">{value}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-16 sm:mt-20">
      <h2 className="
        font-display font-black text-fg-0
        text-xl sm:text-2xl leading-tight tracking-[-0.02em]
        pb-3 border-b border-bg-3
      ">
        {title}
      </h2>
      <div className="mt-6 space-y-4">{children}</div>
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-8 first:mt-0">
      <h3 className="font-display font-bold text-fg-0 text-base sm:text-lg leading-tight tracking-[-0.01em]">
        {title}
      </h3>
      <div className="mt-3 space-y-3">{children}</div>
    </div>
  );
}

function P({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`font-mono text-sm text-fg-2 leading-relaxed ${className ?? ''}`}>
      {children}
    </p>
  );
}

function ListItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3 leading-relaxed">
      <span className="text-fg-5 shrink-0 mt-0.5" aria-hidden="true">→</span>
      <span>{children}</span>
    </li>
  );
}
