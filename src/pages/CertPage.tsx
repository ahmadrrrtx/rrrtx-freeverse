import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageShell } from '../components/layout/PageShell';
import { Container } from '../components/atoms/Container';
import { Button } from '../components/atoms/Button';
import { Certificate } from '../components/certificate/Certificate';
import { CertActions } from '../components/certificate/CertActions';
import { VerifiedBanner } from '../components/cert-page/VerifiedBanner';
import { IntegrityPanel } from '../components/cert-page/IntegrityPanel';
import { api, describeError } from '../lib/api';
import { CREDENTIAL_DISCLOSURE } from '../../shared/levels';
import type { PublicCredential } from '../types';

const CERT_ID_RE = /^RFV-\d{4}-[A-F0-9]{8}$/;

type Lookup =
  | { kind: 'loading' }
  | { kind: 'found'; credential: PublicCredential; notes: string[]; state: 'valid' | 'revoked' }
  | { kind: 'not-found' }
  | { kind: 'untrusted' }
  | { kind: 'unavailable' }
  | { kind: 'error'; message: string };

/**
 * /cert/:credentialId — public credential page.
 *
 * The page always asks the server. A locally cached copy is never
 * used to assert authenticity, because localStorage is editable by
 * anyone with access to the browser.
 */
export function CertPage() {
  const { certId } = useParams<{ certId: string }>();
  const [lookup, setLookup] = useState<Lookup>({ kind: 'loading' });
  const paperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const id = (certId ?? '').trim().toUpperCase();
    if (!CERT_ID_RE.test(id)) {
      setLookup({ kind: 'not-found' });
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const response = await api.verify(id);
        if (cancelled) return;
        if (response.state === 'valid' && response.credential) {
          setLookup({ kind: 'found', credential: response.credential, notes: response.notes, state: 'valid' });
        } else if (response.state === 'revoked' && response.credential) {
          setLookup({ kind: 'found', credential: response.credential, notes: response.notes, state: 'revoked' });
        } else if (response.state === 'registry-unavailable') {
          setLookup({ kind: 'unavailable' });
        } else if (response.state === 'unauthenticated-record') {
          setLookup({ kind: 'untrusted' });
        } else {
          setLookup({ kind: 'not-found' });
        }
      } catch (error) {
        if (!cancelled) setLookup({ kind: 'error', message: describeError(error) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [certId]);

  if (lookup.kind === 'loading') {
    return (
      <PageShell>
        <Container size="app">
          <div className="py-32 text-center">
            <p className="font-mono text-xs uppercase tracking-widest text-fg-4">
              <span className="text-fg-5">// </span>checking the registry…
            </p>
          </div>
        </Container>
      </PageShell>
    );
  }

  if (lookup.kind !== 'found') {
    const message =
      lookup.kind === 'not-found'
        ? 'No credential with that id exists in the public registry.'
        : lookup.kind === 'untrusted'
          ? 'A registry record exists but its signature does not verify, so this page will not display it as a credential.'
          : lookup.kind === 'unavailable'
            ? 'The credential registry could not be reached. This credential is not confirmed right now — please retry.'
            : lookup.message;

    return (
      <PageShell>
        <Container size="app">
          <div className="py-20 sm:py-24">
            <VerifiedBanner state="unverified">{message}</VerifiedBanner>
            <div className="mt-10 max-w-md">
              <p className="font-mono text-sm text-fg-3 leading-relaxed">
                <span className="text-fg-5">// </span>credential ids look like{' '}
                <code className="text-term-glow">RFV-YYYY-XXXXXXXX</code>.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link to="/verify">
                  <Button variant="primary" size="lg" cmd>
                    verify-an-id
                  </Button>
                </Link>
                <Link to="/">
                  <Button variant="ghost" size="lg" cmd>
                    browse-assessments
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </PageShell>
    );
  }

  const { credential, notes, state } = lookup;
  const issued = new Date(credential.issuedAt);
  const certificateData = {
    recipientName: credential.subject.displayName,
    title: credential.credential.title,
    levelLabel: credential.credential.levelLabel,
    skills: credential.credential.skills.map((s) => s.name),
    score: credential.assessment.score,
    passingScore: credential.assessment.passingScore,
    credentialId: credential.id,
    issuedAt: credential.issuedAt,
    verifyUrl: credential.verifyUrl,
    status: credential.status,
    provenance: credential.provenance,
  };

  return (
    <PageShell>
      <Container size="app">
        <div className="py-12 sm:py-16">
          <VerifiedBanner state={state === 'revoked' ? 'unverified' : 'authentic'}>
            {state === 'revoked' ? (
              <>
                This credential has been <strong className="text-fg-0">revoked</strong>
                {credential.revocation?.reason ? ` — ${credential.revocation.reason}` : ''}. It is shown for the record
                only.
              </>
            ) : (
              <>
                Registry record present and signature verified against the issuer public key.
                {credential.provenance === 'legacy-unsigned' && (
                  <span className="block mt-2 text-warn-500">
                    Legacy record: issued before server-side signing, so it cannot be cryptographically verified.
                  </span>
                )}
              </>
            )}
          </VerifiedBanner>

          <div className="mt-12 sm:mt-16">
            <div className="font-mono text-[11px] uppercase tracking-widest text-fg-4 mb-6">
              <span className="text-fg-5">// </span>credential · {credential.id}
            </div>
            <div ref={paperRef} id={`cert-export-${credential.id}`}>
              <Certificate data={certificateData} animated={false} />
            </div>
          </div>

          <section className="mt-12 sm:mt-16">
            <CertActions paperRef={paperRef} credential={credential} />
          </section>

          <section className="mt-16 sm:mt-20">
            <IntegrityPanel
              title="credential_details"
              rows={[
                { label: 'recipient', value: credential.subject.displayName },
                { label: 'credential', value: `${credential.credential.title} · ${credential.credential.levelLabel}` },
                {
                  label: 'score',
                  value: (
                    <>
                      <span className="text-term-glow">{credential.assessment.score}</span> / 100 (pass{' '}
                      {credential.assessment.passingScore}%)
                    </>
                  ),
                  emphasized: true,
                },
                { label: 'issued on', value: issued.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) },
                { label: 'issuer', value: credential.issuer.name },
                { label: 'method', value: credential.assessment.method },
                { label: 'question bank', value: <code className="text-fg-3">{credential.assessment.bankVersion}</code> },
                { label: 'blueprint', value: <code className="text-fg-3 break-all">{credential.assessment.blueprintId}</code> },
                {
                  label: 'signature',
                  value: credential.signature ? (
                    <code className="text-fg-3 break-all">
                      {credential.signature.alg} · {credential.signature.keyId}
                    </code>
                  ) : (
                    <span className="text-warn-500">none (legacy record)</span>
                  ),
                },
                {
                  label: 'learner reference',
                  value: <code className="text-fg-3 break-all">{credential.subject.learnerRef || 'not recorded'}</code>,
                },
              ]}
              sourceLink={{
                href: `https://raw.githubusercontent.com/ahmadrrrtx/rrrtx-freeverse-certs/main/${credential.registryPath}`,
                label: 'view raw registry record (JSON)',
              }}
            />
          </section>

          {notes.length > 0 && (
            <ul className="mt-8 font-mono text-xs text-fg-4 leading-relaxed space-y-1 max-w-2xl">
              {notes.map((note) => (
                <li key={note}>· {note}</li>
              ))}
            </ul>
          )}

          <section className="mt-16 sm:mt-20 border-t border-bg-3 pt-12">
            <div className="font-mono text-[11px] uppercase tracking-widest text-fg-4 mb-4">
              <span className="text-fg-5">// </span>what-this-credential-is
            </div>
            <ul className="font-mono text-xs text-fg-3 leading-relaxed space-y-2 max-w-3xl">
              <li>· {CREDENTIAL_DISCLOSURE.issuerLegalLine}</li>
              <li>· {CREDENTIAL_DISCLOSURE.accreditation}</li>
              <li>· {CREDENTIAL_DISCLOSURE.identity}</li>
              <li>· {CREDENTIAL_DISCLOSURE.integrity}</li>
              <li>· {CREDENTIAL_DISCLOSURE.scoreMeaning}</li>
            </ul>
          </section>

          <div className="mt-16 pt-12 border-t border-bg-3 flex flex-col sm:flex-row gap-3">
            <Link to="/verify">
              <Button variant="ghost" size="lg" cmd>
                verify-another-id
              </Button>
            </Link>
            <Link to="/">
              <Button variant="ghost" size="lg" cmd>
                browse-assessments
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    </PageShell>
  );
}
