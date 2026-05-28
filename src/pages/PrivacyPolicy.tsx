import { Link } from 'react-router-dom';
import { PageShell } from '../components/layout/PageShell';
import { Container } from '../components/atoms/Container';
import { Button } from '../components/atoms/Button';
import { SectionLabel } from '../components/landing/SectionPrimitives';

/**
 * /privacy — Privacy Policy.
 *
 * Drafted to be honest, plain-language, and compliant with the spirit of
 * GDPR + CCPA/CPRA. Reflects what the app ACTUALLY does:
 *   - Client-side only, no backend database
 *   - Personal data lives in the user's own browser (localStorage)
 *   - Only data leaving the browser: email hash (one-way SHA-256) +
 *     name + quiz + score in the public GitHub registry, IF the user
 *     completed a quiz and a cert was issued
 *   - No tracking cookies, no analytics, no ads, no third-party processors
 *     beyond Vercel (hosting) and GitHub (cert registry storage)
 *
 * IMPORTANT NOTE:
 *   This is a thoughtful, transparent privacy policy written from the
 *   facts of how the product works. It is NOT a substitute for legal
 *   advice. For commercial deployment in your jurisdiction (Pakistan,
 *   EU, US, etc.) a local privacy lawyer should review it.
 */
export function PrivacyPolicy() {
  return (
    <PageShell>
      <Container size="prose">
        <article className="py-12 sm:py-20">

          {/* HEADER */}
          <SectionLabel>legal · privacy</SectionLabel>
          <h1 className="
            mt-4 font-display font-black text-fg-0
            text-[2.25rem] leading-[1.05] tracking-[-0.035em]
            sm:text-[3rem] sm:leading-[1]
            lg:text-[3.75rem] lg:tracking-[-0.04em]
            max-w-[20ch]
          ">
            Privacy <span className="text-term-glow">Policy.</span>
          </h1>
          <p className="
            mt-5 font-mono text-sm sm:text-base text-fg-3 leading-relaxed
            max-w-[40rem]
          ">
            <span className="text-fg-5">// </span>
            Plain language. No dark patterns. No surprises.
          </p>

          {/* META TABLE */}
          <div className="mt-10 border border-bg-3 bg-bg-1 divide-y divide-bg-3">
            <MetaRow label="Effective" value="13 May 2026" />
            <MetaRow label="Last updated" value="13 May 2026" />
            <MetaRow label="Operated by" value="Muhammad Ahmad (RRRTX)" />
            <MetaRow label="Contact" value={
              <a
                href="mailto:ahmadrrrtx333@gmail.com"
                className="text-term-glow hover:underline underline-offset-4"
              >
                ahmadrrrtx333@gmail.com
              </a>
            } />
          </div>

          {/* TLDR */}
          <Section title="The 30-second version">
            <p>
              <span className="text-fg-5">// tl;dr</span>
            </p>
            <ul className="mt-4 space-y-2.5 font-mono text-sm text-fg-2">
              <ListItem>RRRTX FreeVerse runs entirely in your browser. There is no user account, no login, no server-side database storing your data.</ListItem>
              <ListItem>Your name, email, certificates, and quiz history live in <strong className="text-fg-0">your browser's localStorage</strong> — on your device only.</ListItem>
              <ListItem>If you pass a quiz and a certificate is issued, the cert is published to a <strong className="text-fg-0">public GitHub registry</strong>. It contains your name, the quiz title, your score, the date, and a <strong className="text-fg-0">one-way hash</strong> of your email — never your raw email address.</ListItem>
              <ListItem>We do not use tracking cookies. We do not use third-party analytics. We do not run ads. We do not sell or share your data.</ListItem>
              <ListItem>You can wipe everything we have on you (locally) with one button on the <Link to="/me" className="text-term-glow hover:underline underline-offset-4">/me</Link> page.</ListItem>
            </ul>
          </Section>

          {/* WHO WE ARE */}
          <Section title="01 · Who we are">
            <P>
              RRRTX FreeVerse ("the service", "we", "us") is a free certification platform built and operated by <strong className="text-fg-0">Muhammad Ahmad</strong>, an independent developer based in Chiniot, Pakistan. The service is open-source and hosted on Vercel.
            </P>
            <P>
              For privacy questions, data requests, or any other concerns, you can reach us at <a href="mailto:ahmadrrrtx333@gmail.com" className="text-term-glow hover:underline underline-offset-4">ahmadrrrtx333@gmail.com</a>.
            </P>
          </Section>

          {/* WHAT WE COLLECT */}
          <Section title="02 · What data we collect, and where it lives">
            <P>
              We only collect the minimum data necessary to issue a certificate. We're listing every single thing.
            </P>

            <SubSection title="a) Information you provide to us">
              <P>
                Before starting a quiz, you enter:
              </P>
              <ul className="mt-3 space-y-2 font-mono text-sm text-fg-2">
                <ListItem><strong className="text-fg-0">Your name</strong> — appears on your certificate as the recipient.</ListItem>
                <ListItem><strong className="text-fg-0">Your email address</strong> — used to generate a unique, deterministic certificate ID. The raw email is <em>never stored on our servers, never transmitted to third parties as plaintext, and never displayed publicly</em>. A one-way SHA-256 hash of the email is stored alongside the cert (so the same email can re-verify a cert later without exposing the address).</ListItem>
              </ul>
              <P>
                Both values are stored in <strong className="text-fg-0">your browser's localStorage</strong> — physically on your device — under the key <code className="text-term-glow">rfv:user</code>.
              </P>
            </SubSection>

            <SubSection title="b) Information generated when you take a quiz">
              <P>
                While a quiz is in progress, the following is stored in your browser's <code className="text-term-glow">sessionStorage</code>:
              </P>
              <ul className="mt-3 space-y-2 font-mono text-sm text-fg-2">
                <ListItem>The randomly-selected questions for your attempt.</ListItem>
                <ListItem>Your in-progress answers (so an accidental reload doesn't lose them).</ListItem>
                <ListItem>The deadline timestamp.</ListItem>
                <ListItem>Secure-mode violation events (e.g. "tab switch detected at 14:22:03").</ListItem>
              </ul>
              <P>
                This data is automatically cleared when you submit, abandon, or close the quiz. It is never sent anywhere.
              </P>
              <P>
                After submission, your <strong className="text-fg-0">quiz result</strong> (score, pass/fail, duration, violation count) is saved permanently in your browser's localStorage under the key <code className="text-term-glow">rfv:results</code>. This powers your personal quiz history visible at <Link to="/me" className="text-term-glow hover:underline underline-offset-4">/me</Link>.
              </P>
            </SubSection>

            <SubSection title="c) Certificates (the only data that leaves your browser)">
              <P>
                If you pass a quiz with 80% or higher, a certificate record is created and stored in two places:
              </P>
              <ul className="mt-3 space-y-2 font-mono text-sm text-fg-2">
                <ListItem><strong className="text-fg-0">Locally</strong>, in your browser's localStorage under the key <code className="text-term-glow">rfv:certificates</code>.</ListItem>
                <ListItem><strong className="text-fg-0">Publicly</strong>, as a JSON file committed to the open GitHub repository <code className="text-term-glow break-all">github.com/ahmadrrrtx/rrrtx-freeverse-certs</code>. This is the registry that makes certificates verifiable forever.</ListItem>
              </ul>
              <P>
                The public registry record contains:
              </P>
              <ul className="mt-3 space-y-2 font-mono text-sm text-fg-2">
                <ListItem>Certificate ID (format <code className="text-term-glow">RFV-YYYY-XXXXXXXX</code>)</ListItem>
                <ListItem>Your name (as it appears on the cert)</ListItem>
                <ListItem>One-way SHA-256 hash of your email (never the raw email)</ListItem>
                <ListItem>Quiz title and ID</ListItem>
                <ListItem>Your score</ListItem>
                <ListItem>Issuance timestamp</ListItem>
                <ListItem>Integrity record: secure mode status, violation count</ListItem>
              </ul>
              <P className="text-warn-500">
                <span className="text-warn-500/70">// note: </span>
                Once a record is published to the public registry, it is part of GitHub's commit history and we cannot guarantee its complete removal. See the "Your rights" section below for details.
              </P>
            </SubSection>

            <SubSection title="d) Server logs (Vercel hosting)">
              <P>
                Our hosting provider, Vercel, receives standard HTTP request logs when you visit the site. These include your IP address, user agent (browser), URL accessed, and timestamp. Vercel uses this for traffic routing, abuse prevention, and performance monitoring under their own terms.
              </P>
              <P>
                <strong className="text-fg-0">We do not access, retain, or analyze these logs.</strong> They are governed by{' '}
                <a
                  href="https://vercel.com/legal/privacy-policy"
                  target="_blank" rel="noreferrer noopener"
                  className="text-term-glow hover:underline underline-offset-4"
                >
                  Vercel's privacy policy
                </a>.
              </P>
            </SubSection>

            <SubSection title="e) What we DO NOT collect">
              <ul className="mt-3 space-y-2 font-mono text-sm text-fg-2">
                <ListItem>❌ No tracking cookies</ListItem>
                <ListItem>❌ No third-party analytics (no Google Analytics, no Plausible, no Mixpanel, nothing)</ListItem>
                <ListItem>❌ No advertising pixels (no Meta Pixel, no LinkedIn Insight Tag, etc.)</ListItem>
                <ListItem>❌ No webcam, microphone, or screen recording (we don't ask for these permissions)</ListItem>
                <ListItem>❌ No location data</ListItem>
                <ListItem>❌ No phone numbers</ListItem>
                <ListItem>❌ No payment information (the service is free)</ListItem>
                <ListItem>❌ No data brokers, no profiling, no data sales</ListItem>
              </ul>
            </SubSection>
          </Section>

          {/* WHY */}
          <Section title="03 · Why we collect what we collect (legal basis)">
            <P>
              Under GDPR Article 6, the legal basis for processing your name and email is <strong className="text-fg-0">your explicit consent</strong>, which you provide by entering the information and checking the consent box before starting a quiz.
            </P>
            <P>
              Under CCPA/CPRA, the data we process is necessary for the <strong className="text-fg-0">primary purpose</strong> for which it was collected: issuing you a verifiable certificate.
            </P>
            <P>
              We do not process your data for any secondary purpose (marketing, profiling, advertising, etc.).
            </P>
          </Section>

          {/* SHARING */}
          <Section title="04 · Who we share data with">
            <P>
              We have <strong className="text-fg-0">two infrastructure partners</strong>, and that's it:
            </P>
            <ul className="mt-3 space-y-2 font-mono text-sm text-fg-2">
              <ListItem><strong className="text-fg-0">Vercel Inc.</strong> — hosts the static site and runs the certificate-issuing Edge Function. Subject to <a href="https://vercel.com/legal/dpa" target="_blank" rel="noreferrer noopener" className="text-term-glow hover:underline underline-offset-4">Vercel's Data Processing Agreement</a> and{' '}
                <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noreferrer noopener" className="text-term-glow hover:underline underline-offset-4">privacy policy</a>.
              </ListItem>
              <ListItem><strong className="text-fg-0">GitHub, Inc.</strong> (a Microsoft subsidiary) — stores the public certificate registry as a Git repository. Subject to{' '}
                <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noreferrer noopener" className="text-term-glow hover:underline underline-offset-4">GitHub's privacy statement</a>.
              </ListItem>
            </ul>
            <P>
              We do not share, sell, lease, trade, or rent your personal information to any other third party. Ever.
            </P>
          </Section>

          {/* DATA RETENTION */}
          <Section title="05 · How long we keep your data">
            <ul className="mt-3 space-y-2 font-mono text-sm text-fg-2">
              <ListItem><strong className="text-fg-0">Local data</strong> (profile, quiz history, certificates) stays in your browser <em>indefinitely</em>, until you delete it via the "Reset everything" button on <Link to="/me" className="text-term-glow hover:underline underline-offset-4">/me</Link>, clear your browser data, or uninstall your browser.</ListItem>
              <ListItem><strong className="text-fg-0">Session data</strong> (in-progress attempts) is automatically deleted when the quiz ends or the browser tab closes.</ListItem>
              <ListItem><strong className="text-fg-0">Public registry records</strong> are <em>permanent by design</em>. The whole point of a verifiable credential is that anyone can re-verify it years later. Deletion is possible (see "Your rights") but it leaves an audit trail in the Git commit history.</ListItem>
              <ListItem><strong className="text-fg-0">Server logs</strong> are retained by Vercel per their policy, typically 30 days for security/abuse prevention.</ListItem>
            </ul>
          </Section>

          {/* YOUR RIGHTS */}
          <Section title="06 · Your rights">
            <P>
              Regardless of where you live, here's what you can do:
            </P>

            <SubSection title="Delete your local data instantly">
              <P>
                Go to <Link to="/me" className="text-term-glow hover:underline underline-offset-4">/me</Link> → scroll to <strong className="text-fg-0">Danger Zone</strong> → click "Reset everything". This wipes your profile, certificates, and quiz history from your browser in one click. No email confirmation, no waiting period.
              </P>
            </SubSection>

            <SubSection title="Export your data (data portability)">
              <P>
                Go to <Link to="/me" className="text-term-glow hover:underline underline-offset-4">/me</Link> → click "Export". You'll download a JSON file containing everything we have on you locally. You can re-import it later on any device using the "Import" button.
              </P>
            </SubSection>

            <SubSection title="Request deletion from the public registry">
              <P>
                If you want a specific certificate removed from the public GitHub registry, email <a href="mailto:ahmadrrrtx333@gmail.com" className="text-term-glow hover:underline underline-offset-4">ahmadrrrtx333@gmail.com</a> with the certificate ID. We'll:
              </P>
              <ul className="mt-3 space-y-2 font-mono text-sm text-fg-2">
                <ListItem>Verify you own the cert (by sending a confirmation to the email associated with the cert hash).</ListItem>
                <ListItem>Remove the JSON file from the registry's <code className="text-term-glow">main</code> branch within 30 days.</ListItem>
                <ListItem>Note honestly: the cert's prior existence remains in GitHub's commit history, since Git is by design append-only. We can attempt to rewrite history (force-push) to remove it fully, but this is not always feasible if the registry has been forked or mirrored.</ListItem>
              </ul>
            </SubSection>

            <SubSection title="Additional rights under EU/UK GDPR">
              <P>
                If you are in the European Economic Area or the United Kingdom, you also have the right to:
              </P>
              <ul className="mt-3 space-y-2 font-mono text-sm text-fg-2">
                <ListItem>Access the personal data we hold about you (limited to the public registry — we don't hold anything else server-side).</ListItem>
                <ListItem>Rectify inaccurate data (e.g. typo in your name on a cert — we can re-issue with the corrected version).</ListItem>
                <ListItem>Restrict or object to processing.</ListItem>
                <ListItem>Lodge a complaint with your local supervisory authority.</ListItem>
              </ul>
            </SubSection>

            <SubSection title="Additional rights under CCPA/CPRA (California)">
              <P>
                If you are a California resident, you have the right to:
              </P>
              <ul className="mt-3 space-y-2 font-mono text-sm text-fg-2">
                <ListItem>Know what personal information we collect (listed above in Section 02).</ListItem>
                <ListItem>Delete personal information (instructions above).</ListItem>
                <ListItem>Opt out of the sale or sharing of personal information — <strong className="text-term-glow">we do not sell or share your data, so this opt-out is moot.</strong></ListItem>
                <ListItem>Non-discrimination for exercising any of these rights.</ListItem>
              </ul>
            </SubSection>
          </Section>

          {/* SECURITY */}
          <Section title="07 · How we protect your data">
            <ul className="mt-3 space-y-2 font-mono text-sm text-fg-2">
              <ListItem>The entire site is served over <strong className="text-fg-0">HTTPS</strong> (TLS 1.2+).</ListItem>
              <ListItem>Email addresses are <strong className="text-fg-0">hashed with SHA-256</strong> before being included in any certificate record. We don't store the raw email on any server.</ListItem>
              <ListItem>The cert-issuing Edge Function authenticates to GitHub using a scoped Personal Access Token stored in <strong className="text-fg-0">Vercel's encrypted environment variables</strong>. The token is never exposed to client code.</ListItem>
              <ListItem>Certificate IDs are deterministic hashes that include a secret salt + integrity record, so tampering with any field of the cert breaks the hash.</ListItem>
              <ListItem>The full source code, including the security model, is{' '}
                <a href="https://github.com/ahmadrrrtx" target="_blank" rel="noreferrer noopener" className="text-term-glow hover:underline underline-offset-4">
                  open source and auditable
                </a>.
              </ListItem>
            </ul>
            <P>
              No system is perfectly secure. If you become aware of a vulnerability, please email us at the contact above so we can address it responsibly.
            </P>
          </Section>

          {/* CHILDREN */}
          <Section title="08 · Children">
            <P>
              The service is not directed at children under 13 (or 16 in the EU). We do not knowingly collect personal information from children in these age ranges. If you believe we have collected data from a minor, please contact us and we will delete it.
            </P>
          </Section>

          {/* INTERNATIONAL TRANSFERS */}
          <Section title="09 · International data transfers">
            <P>
              Our infrastructure providers (Vercel and GitHub) are based in the United States and operate global edge networks. By using the service, your data (specifically, the public certificate record if one is issued) may be replicated to US-based servers.
            </P>
            <P>
              Both Vercel and GitHub are signatories to the EU-US Data Privacy Framework and rely on Standard Contractual Clauses for EU/UK data transfers. The data we transmit to them is minimal and includes no sensitive personal information.
            </P>
          </Section>

          {/* CHANGES */}
          <Section title="10 · Changes to this policy">
            <P>
              We may update this policy from time to time to reflect new features, legal requirements, or feedback. When we do:
            </P>
            <ul className="mt-3 space-y-2 font-mono text-sm text-fg-2">
              <ListItem>The "Last updated" date at the top changes.</ListItem>
              <ListItem>Material changes are announced on the project's GitHub repository.</ListItem>
              <ListItem>Older versions remain available in the project's Git history.</ListItem>
            </ul>
          </Section>

          {/* CONTACT */}
          <Section title="11 · Contact">
            <P>
              Questions, requests, or complaints — email{' '}
              <a href="mailto:ahmadrrrtx333@gmail.com" className="text-term-glow hover:underline underline-offset-4">
                ahmadrrrtx333@gmail.com
              </a>{' '}
              with the subject line "Privacy".
            </P>
            <P>
              We aim to respond within 7 days for routine inquiries and within 30 days for formal data requests.
            </P>
          </Section>

          {/* FOOTER NOTE */}
          <div className="mt-16 border border-bg-3 bg-bg-1 p-5 sm:p-6">
            <div className="font-mono text-[11px] uppercase tracking-widest text-fg-4 mb-3">
              <span className="text-fg-5">// </span>plain-english note
            </div>
            <p className="font-mono text-xs sm:text-sm text-fg-3 leading-relaxed">
              This policy is written in plain English and reflects exactly how the product works in 2026. It is not boilerplate. If a future change to the product makes any statement above inaccurate, the policy will be updated to match — that's the commitment.
            </p>
          </div>

          {/* BACK */}
          <div className="mt-16 sm:mt-20 pt-12 border-t border-bg-3 flex flex-col sm:flex-row gap-3">
            <Link to="/">
              <Button variant="ghost" size="lg" cmd>back-to-home</Button>
            </Link>
            <Link to="/terms">
              <Button variant="ghost" size="lg" cmd>view-terms</Button>
            </Link>
          </div>

        </article>
      </Container>
    </PageShell>
  );
}

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="
      grid grid-cols-[120px_1fr] sm:grid-cols-[180px_1fr]
      gap-4 sm:gap-6
      px-5 sm:px-6 py-3.5
      items-baseline
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
