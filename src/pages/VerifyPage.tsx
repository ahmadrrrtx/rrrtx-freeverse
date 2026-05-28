import { useState, useEffect, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PageShell } from '../components/layout/PageShell';
import { Container } from '../components/atoms/Container';
import { Button } from '../components/atoms/Button';
import { VerifiedBanner } from '../components/cert-page/VerifiedBanner';
import { IntegrityPanel } from '../components/cert-page/IntegrityPanel';
import { fetchFromRegistry } from '../lib/githubRegistry';
import { getCertificates } from '../lib/storage';
import type { Certificate as CertificateRecord } from '../types';

/** Valid cert ID format: RFV-YYYY-XXXXXXXX (8 hex uppercase chars) */
const CERT_ID_RE = /^RFV-\d{4}-[A-F0-9]{8}$/i;

type LookupState =
  | { kind: 'idle' }
  | { kind: 'checking'; id: string }
  | { kind: 'found'; cert: CertificateRecord; source: 'local' | 'registry' }
  | { kind: 'invalid-format' }
  | { kind: 'not-found'; id: string };

/**
 * /verify — Public certificate verification page.
 *
 * Two entry modes:
 *   1. Empty form → user pastes a cert ID
 *   2. ?id=RFV-... → auto-verifies on mount
 *
 * Lookup order: local certs → public GitHub registry.
 */
export function VerifyPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [input, setInput] = useState('');
  const [state, setState] = useState<LookupState>({ kind: 'idle' });

  // Auto-verify if ?id= is present in URL
  useEffect(() => {
    const idParam = searchParams.get('id');
    if (idParam) {
      setInput(idParam);
      void doLookup(idParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function doLookup(rawId: string) {
    const id = rawId.trim().toUpperCase();

    if (!CERT_ID_RE.test(id)) {
      setState({ kind: 'invalid-format' });
      return;
    }

    setState({ kind: 'checking', id });

    // 1. Local first (instant)
    const local = getCertificates().find((c) => c.id === id);
    if (local) {
      setState({ kind: 'found', cert: local, source: 'local' });
      return;
    }

    // 2. Public registry
    try {
      const remote = await fetchFromRegistry(id);
      if (remote) {
        setState({ kind: 'found', cert: remote, source: 'registry' });
      } else {
        setState({ kind: 'not-found', id });
      }
    } catch {
      setState({ kind: 'not-found', id });
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void doLookup(input);
  }

  return (
    <PageShell>
      <Container size="app">
        <div className="py-12 sm:py-20">

          {/* HEADER */}
          <div className="font-mono text-[11px] uppercase tracking-widest text-fg-4">
            <span className="text-fg-5">// </span>verify-cert
          </div>
          <h1 className="
            mt-4 font-display font-black text-fg-0
            text-[2.25rem] leading-[1.05] tracking-[-0.035em]
            sm:text-[3rem] sm:leading-[1]
            lg:text-[3.75rem] lg:tracking-[-0.04em]
            max-w-[20ch]
          ">
            Authenticate a <span className="text-term-glow">certificate.</span>
          </h1>
          <p className="
            mt-5 font-mono text-fg-3 leading-relaxed
            text-sm sm:text-base
            max-w-[40rem]
          ">
            <span className="text-fg-5">// </span>
            Enter a certificate ID to check its authenticity. We'll look it up in the public
            GitHub registry and confirm the integrity record.
          </p>

          {/* FORM */}
          <form onSubmit={handleSubmit} className="mt-12 max-w-2xl">
            <label
              htmlFor="cert-id-input"
              className="font-mono text-[11px] uppercase tracking-widest text-fg-3"
            >
              certificate id
            </label>
            <div className="
              mt-2 flex flex-col sm:flex-row gap-3
            ">
              <input
                id="cert-id-input"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="RFV-2026-A3F9C2B8"
                autoComplete="off"
                spellCheck={false}
                className="
                  flex-1 min-w-0
                  bg-bg-1 border border-bg-3
                  min-h-[52px] px-4
                  font-mono text-base sm:text-lg text-fg-0
                  placeholder:text-fg-5
                  outline-none
                  focus:border-term-glow focus:bg-bg-0
                  transition-colors duration-snap
                  tracking-wide uppercase
                "
              />
              <Button
                type="submit"
                variant="primary"
                size="lg"
                cmd
                loading={state.kind === 'checking'}
              >
                verify →
              </Button>
            </div>
            <p className="mt-3 font-mono text-xs text-fg-5 leading-relaxed">
              format: <code className="text-fg-3">RFV-YYYY-XXXXXXXX</code> (8-character hex code)
            </p>
          </form>

          {/* RESULTS */}
          <div className="mt-12">
            {state.kind === 'checking' && (
              <VerifiedBanner state="pending">
                Looking up <code className="text-fg-0">{state.id}</code> in the public registry…
              </VerifiedBanner>
            )}

            {state.kind === 'invalid-format' && (
              <VerifiedBanner state="unverified">
                That doesn't look like a valid certificate ID. Expected format:{' '}
                <code className="text-fg-0">RFV-YYYY-XXXXXXXX</code>
              </VerifiedBanner>
            )}

            {state.kind === 'not-found' && (
              <VerifiedBanner state="unverified">
                No certificate found with ID <code className="text-fg-0">{state.id}</code>.
                It may be invalid, mistyped, or hasn't been published to the registry yet.
              </VerifiedBanner>
            )}

            {state.kind === 'found' && (
              <FoundResult cert={state.cert} source={state.source} onViewFull={() => {
                navigate(`/cert/${state.cert.id}`);
              }} />
            )}
          </div>

          {/* TRUST EXPLANATION */}
          <section className="mt-20 sm:mt-24 border-t border-bg-3 pt-12 sm:pt-16">
            <div className="font-mono text-[11px] uppercase tracking-widest text-fg-4 mb-4">
              <span className="text-fg-5">// </span>about-verification
            </div>
            <h2 className="font-display font-black text-fg-0 text-2xl sm:text-3xl tracking-[-0.025em] leading-tight max-w-xl">
              Why these certs are <span className="text-term-glow">trustworthy.</span>
            </h2>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-px bg-bg-3 border border-bg-3">
              <TrustCell
                title="Cryptographic ID"
                body="Cert IDs are SHA-256 hashes of recipient + score + date + integrity + secret salt. The same inputs always produce the same ID — tampering breaks the hash."
              />
              <TrustCell
                title="Public Registry"
                body="Every cert is a JSON file in a public GitHub repo. The full issuance history is auditable by anyone. We can't quietly revoke or edit a cert without a visible commit."
              />
              <TrustCell
                title="Earned Live, Not Bought"
                body="Issued only after passing a 20-question test with 80%+. No 'completion certificates' from watching videos. The score is on the cert."
              />
              <TrustCell
                title="Integrity Score"
                body="The cert hash includes a record of how cleanly the test was taken. 0 violations = clean attempt. Violations are visible on the verification page."
              />
            </div>
          </section>

          {/* BACK TO HOME */}
          <div className="mt-16 sm:mt-20 pt-12 border-t border-bg-3">
            <Link to="/">
              <Button variant="ghost" size="lg" cmd>back-to-quizzes</Button>
            </Link>
          </div>
        </div>
      </Container>
    </PageShell>
  );
}

// ─────────────────────────────────────────────────────────
// FOUND RESULT BLOCK
// ─────────────────────────────────────────────────────────
function FoundResult({
  cert,
  source,
  onViewFull,
}: {
  cert: CertificateRecord;
  source: 'local' | 'registry';
  onViewFull: () => void;
}) {
  const issuedDate = new Date(cert.issued_at);
  const formattedDate = issuedDate.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="space-y-8">
      <VerifiedBanner state="authentic">
        This certificate is registered.{' '}
        {source === 'registry' ? 'Verified against public GitHub registry.' : 'Found in your local certs.'}
      </VerifiedBanner>

      <IntegrityPanel
        rows={[
          { label: 'recipient',     value: cert.recipient.name },
          { label: 'for',           value: cert.quiz.title },
          { label: 'score',         value: <><span className="text-term-glow">{cert.score}</span> / 100</>, emphasized: true },
          { label: 'issued',        value: formattedDate },
          { label: 'issuer',        value: cert.issuer },
          {
            label: 'integrity',
            value: cert.integrity.violations === 0
              ? <span className="text-term-glow">✓ clean attempt · 0 violations</span>
              : <span className="text-warn-500">⚠ {cert.integrity.violations} {cert.integrity.violations === 1 ? 'violation' : 'violations'}</span>,
          },
        ]}
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <Button variant="primary" size="lg" cmd onClick={onViewFull}>
          view-full-certificate →
        </Button>
      </div>
    </div>
  );
}

function TrustCell({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-bg-0 p-5 sm:p-6">
      <h3 className="font-display font-bold text-fg-0 text-base leading-tight tracking-[-0.01em]">
        {title}
      </h3>
      <p className="mt-3 font-mono text-xs text-fg-3 leading-relaxed">
        {body}
      </p>
    </div>
  );
}
