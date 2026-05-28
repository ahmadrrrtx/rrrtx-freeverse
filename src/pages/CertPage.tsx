import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageShell } from '../components/layout/PageShell';
import { Container } from '../components/atoms/Container';
import { Button } from '../components/atoms/Button';
import { Certificate } from '../components/certificate/Certificate';
import { CertActions } from '../components/certificate/CertActions';
import { VerifiedBanner } from '../components/cert-page/VerifiedBanner';
import { IntegrityPanel } from '../components/cert-page/IntegrityPanel';
import { QUIZ_CATALOG } from '../data/quizMeta';
import { getCertificates } from '../lib/storage';
import { fetchFromRegistry } from '../lib/githubRegistry';
import type { Certificate as CertificateRecord } from '../types';

/**
 * /cert/:certId — Public certificate page.
 *
 * This is the URL people share with recruiters, on LinkedIn, etc.
 * Order of lookup:
 *   1. Local storage (instant — for the owner's own browser)
 *   2. GitHub registry (fetch raw JSON via fetchFromRegistry)
 *   3. If both fail → "could not verify" state
 */
type LookupState =
  | { kind: 'loading' }
  | { kind: 'found'; cert: CertificateRecord; source: 'local' | 'registry' }
  | { kind: 'not-found' };

export function CertPage() {
  const { certId } = useParams<{ certId: string }>();
  const [lookup, setLookup] = useState<LookupState>({ kind: 'loading' });
  const paperRef = useRef<HTMLDivElement | null>(null);

  // ── Lookup the certificate ──
  useEffect(() => {
    if (!certId) {
      setLookup({ kind: 'not-found' });
      return;
    }

    let cancelled = false;

    (async () => {
      // 1. Check local storage first
      const local = getCertificates().find((c) => c.id === certId);
      if (local) {
        if (!cancelled) setLookup({ kind: 'found', cert: local, source: 'local' });
        return;
      }

      // 2. Try the public GitHub registry
      try {
        const remote = await fetchFromRegistry(certId);
        if (cancelled) return;
        if (remote) {
          setLookup({ kind: 'found', cert: remote, source: 'registry' });
        } else {
          setLookup({ kind: 'not-found' });
        }
      } catch {
        if (!cancelled) setLookup({ kind: 'not-found' });
      }
    })();

    return () => { cancelled = true; };
  }, [certId]);

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────

  if (lookup.kind === 'loading') {
    return (
      <PageShell>
        <Container size="app">
          <div className="py-32 text-center">
            <p className="font-mono text-xs uppercase tracking-widest text-fg-4">
              <span className="text-fg-5">// </span>verifying certificate...
            </p>
          </div>
        </Container>
      </PageShell>
    );
  }

  if (lookup.kind === 'not-found') {
    return (
      <PageShell>
        <Container size="app">
          <div className="py-20 sm:py-24">
            <VerifiedBanner state="unverified">
              The certificate ID <code className="text-fg-0 font-medium">{certId}</code>{' '}
              could not be found in the public registry. It may be invalid, mistyped, or revoked.
            </VerifiedBanner>

            <div className="mt-10 max-w-md">
              <p className="font-mono text-sm text-fg-3 leading-relaxed">
                <span className="text-fg-5">// </span>cert ids look like{' '}
                <code className="text-term-glow">RFV-YYYY-XXXXXXXX</code> where Y is the year and X is an 8-character hex code.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link to="/verify">
                  <Button variant="primary" size="lg" cmd>verify-different-id</Button>
                </Link>
                <Link to="/">
                  <Button variant="ghost" size="lg" cmd>browse-quizzes</Button>
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </PageShell>
    );
  }

  // ── FOUND ──
  return <CertPageContent cert={lookup.cert} source={lookup.source} paperRef={paperRef} />;
}

// ─────────────────────────────────────────────────────────
// FOUND content
// ─────────────────────────────────────────────────────────
function CertPageContent({
  cert,
  source,
  paperRef,
}: {
  cert: CertificateRecord;
  source: 'local' | 'registry';
  paperRef: React.MutableRefObject<HTMLDivElement | null>;
}) {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const certData = useMemo(() => {
    const quiz = QUIZ_CATALOG.find((q) => q.id === cert.quiz.id);
    return {
      recipientName: cert.recipient.name,
      quizTitle:     cert.quiz.title,
      quizCategory:  quiz?.category ?? 'General',
      score:         cert.score,
      certId:        cert.id,
      dateISO:       cert.issued_at,
      verifyUrl:     cert.verify_url,
    };
  }, [cert]);

  const issuedDate = new Date(cert.issued_at);
  const formattedDate = issuedDate.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  // Build GitHub registry source link
  const year = issuedDate.getUTCFullYear();
  const month = String(issuedDate.getUTCMonth() + 1).padStart(2, '0');
  const registryUrl = `https://github.com/ahmadrrrtx/rrrtx-freeverse-certs/blob/main/certs/${year}/${month}/${cert.id}.json`;

  return (
    <PageShell>
      <Container size="app">
        <div className="py-12 sm:py-16">

          {/* TRUST BANNER */}
          <VerifiedBanner state="authentic">
            This certificate is authentic and was earned on RRRTX FreeVerse.{' '}
            {source === 'registry' && (
              <span>Verified against public GitHub registry.</span>
            )}
            {source === 'local' && (
              <span>Verified from your local certs.</span>
            )}
          </VerifiedBanner>

          {/* Meta line above cert */}
          <div className="mt-12 sm:mt-16">
            <div className="font-mono text-[11px] uppercase tracking-widest text-fg-4 mb-6">
              <span className="text-fg-5">// </span>certificate · {cert.id}
            </div>

            {/* THE CERTIFICATE */}
            <div ref={paperRef} id={`cert-export-${cert.id}`}>
              <Certificate data={certData} animated={false} />
            </div>
          </div>

          {/* SHARE/DOWNLOAD ACTIONS */}
          <section className="mt-12 sm:mt-16">
            <CertActions paperRef={paperRef} cert={cert} baseUrl={baseUrl} />
          </section>

          {/* INTEGRITY DETAILS */}
          <section className="mt-16 sm:mt-20">
            <IntegrityPanel
              title="integrity_details"
              rows={[
                { label: 'recipient',     value: cert.recipient.name },
                { label: 'quiz',          value: cert.quiz.title },
                { label: 'score',         value: <><span className="text-term-glow">{cert.score}</span> / 100</>, emphasized: true },
                { label: 'issued on',     value: formattedDate },
                { label: 'cert id',       value: <code className="text-term-glow">{cert.id}</code> },
                { label: 'issuer',        value: cert.issuer },
                {
                  label: 'secure mode',
                  value: cert.integrity.completed_in_secure_mode
                    ? <span className="text-term-glow">✓ completed in secure mode</span>
                    : <span className="text-warn-500">⚠ not in secure mode</span>,
                },
                {
                  label: 'violations',
                  value: cert.integrity.violations === 0
                    ? <span className="text-term-glow">0 — clean attempt</span>
                    : <span className="text-warn-500">{cert.integrity.violations} recorded</span>,
                },
                { label: 'email hash',    value: <code className="text-fg-3 break-all">{cert.recipient.email_hash}</code> },
              ]}
              sourceLink={{
                href: registryUrl,
                label: 'view raw record in public registry',
              }}
            />
          </section>

          {/* HOW VERIFICATION WORKS */}
          <section className="mt-16 sm:mt-20 border-t border-bg-3 pt-12 sm:pt-16">
            <div className="font-mono text-[11px] uppercase tracking-widest text-fg-4 mb-4">
              <span className="text-fg-5">// </span>how-verification-works
            </div>
            <h2 className="font-display font-black text-fg-0 text-2xl sm:text-3xl tracking-[-0.025em] leading-tight max-w-xl">
              How do we know this <span className="text-term-glow">is real?</span>
            </h2>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-px bg-bg-3 border border-bg-3">
              <ExplainCell
                num="01"
                title="Cryptographic ID"
                body="The cert ID is a SHA-256 hash of name + email + quiz + score + date + integrity + a secret salt. Tampering with any field breaks the hash."
              />
              <ExplainCell
                num="02"
                title="Public Registry"
                body="Every issued cert is committed to a public GitHub repository as a JSON file. Anyone can audit the entire issuance history."
              />
              <ExplainCell
                num="03"
                title="Secure Mode"
                body="Earned under browser-level anti-cheat (fullscreen lock, tab detection, copy/paste block). Integrity is baked into the cert hash."
              />
            </div>
          </section>

          {/* FOOTER ACTIONS */}
          <div className="mt-16 sm:mt-20 pt-12 border-t border-bg-3 flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Link to="/verify">
              <Button variant="ghost" size="lg" cmd>verify-different-id</Button>
            </Link>
            <Link to="/">
              <Button variant="ghost" size="lg" cmd>browse-quizzes</Button>
            </Link>
          </div>
        </div>
      </Container>
    </PageShell>
  );
}

// Small helper for the "how it works" grid
function ExplainCell({ num, title, body }: { num: string; title: string; body: string }) {
  return (
    <div className="bg-bg-0 p-5 sm:p-6 flex flex-col gap-3">
      <div className="font-display font-black text-term-glow text-2xl leading-none">
        {num}
      </div>
      <h3 className="font-display font-bold text-fg-0 text-base leading-tight tracking-[-0.01em]">
        {title}
      </h3>
      <p className="font-mono text-xs text-fg-3 leading-relaxed">
        {body}
      </p>
    </div>
  );
}
