import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageShell } from '../components/layout/PageShell';
import { Container } from '../components/atoms/Container';
import { Button } from '../components/atoms/Button';
import { VerifiedBanner } from '../components/cert-page/VerifiedBanner';
import { IntegrityPanel } from '../components/cert-page/IntegrityPanel';
import { api, describeError } from '../lib/api';
import { CREDENTIAL_DISCLOSURE } from '../../shared/levels';
import type { VerifyResponse } from '../types';

const CERT_ID_RE = /^RFV-\d{4}-[A-F0-9]{8}$/;

type LookupState =
  | { kind: 'idle' }
  | { kind: 'checking'; id: string }
  | { kind: 'result'; response: VerifyResponse }
  | { kind: 'invalid-format' }
  | { kind: 'error'; message: string };

/**
 * /verify — public verification.
 *
 * All decisions are made by the server (/api/verify): it reads the
 * registry record, checks the revocation list and verifies the
 * Ed25519 signature. This page only renders what the server
 * reported, so query-string tampering or editing this JavaScript
 * cannot make a credential look valid.
 */
export function VerifyPage() {
  const [searchParams] = useSearchParams();
  const [input, setInput] = useState('');
  const [state, setState] = useState<LookupState>({ kind: 'idle' });

  const lookup = useCallback(async (rawId: string) => {
    const id = rawId.trim().toUpperCase();
    if (!CERT_ID_RE.test(id)) {
      setState({ kind: 'invalid-format' });
      return;
    }
    setState({ kind: 'checking', id });
    try {
      const response = await api.verify(id);
      setState({ kind: 'result', response });
    } catch (error) {
      setState({ kind: 'error', message: describeError(error) });
    }
  }, []);

  useEffect(() => {
    const idParam = searchParams.get('id');
    if (idParam) {
      setInput(idParam);
      void lookup(idParam);
    }
  }, [searchParams, lookup]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void lookup(input);
  }

  return (
    <PageShell>
      <Container size="app">
        <div className="py-12 sm:py-20">
          <div className="font-mono text-[11px] uppercase tracking-widest text-fg-4">
            <span className="text-fg-5">// </span>verify-credential
          </div>
          <h1 className="mt-4 font-display font-black text-fg-0 text-[2.25rem] leading-[1.05] tracking-[-0.035em] sm:text-[3rem] sm:leading-[1] lg:text-[3.75rem] max-w-[22ch]">
            Check a <span className="text-term-glow">credential.</span>
          </h1>
          <p className="mt-5 font-mono text-fg-3 leading-relaxed text-sm sm:text-base max-w-[42rem]">
            <span className="text-fg-5">// </span>
            Enter a credential id. The server looks it up in the public registry, checks whether it has been revoked,
            and verifies the issuer&rsquo;s Ed25519 signature over the record.
          </p>

          <form onSubmit={handleSubmit} className="mt-12 max-w-2xl" noValidate>
            <label htmlFor="cert-id-input" className="font-mono text-[11px] uppercase tracking-widest text-fg-3">
              credential id
            </label>
            <div className="mt-2 flex flex-col sm:flex-row gap-3">
              <input
                id="cert-id-input"
                name="credentialId"
                type="text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="RFV-2026-A3F9C2B8"
                autoComplete="off"
                spellCheck={false}
                aria-describedby="cert-id-help"
                className="flex-1 min-w-0 bg-bg-1 border border-bg-3 min-h-[52px] px-4 font-mono text-base sm:text-lg text-fg-0 placeholder:text-fg-5 outline-none focus:border-term-glow focus:bg-bg-0 transition-colors tracking-wide uppercase"
              />
              <Button type="submit" variant="primary" size="lg" cmd loading={state.kind === 'checking'}>
                verify →
              </Button>
            </div>
            <p id="cert-id-help" className="mt-3 font-mono text-xs text-fg-5 leading-relaxed">
              format: <code className="text-fg-3">RFV-YYYY-XXXXXXXX</code> (eight hexadecimal characters)
            </p>
          </form>

          <div className="mt-12">
            {state.kind === 'checking' && (
              <VerifiedBanner state="pending">
                Checking <code className="text-fg-0">{state.id}</code> against the registry…
              </VerifiedBanner>
            )}

            {state.kind === 'invalid-format' && (
              <VerifiedBanner state="unverified">
                That does not look like a credential id. Expected format:{' '}
                <code className="text-fg-0">RFV-YYYY-XXXXXXXX</code>
              </VerifiedBanner>
            )}

            {state.kind === 'error' && (
              <VerifiedBanner state="unverified">
                Verification could not be completed: {state.message} This does <strong className="text-fg-0">not</strong>{' '}
                mean the credential is valid — it means we could not check. Please retry.
              </VerifiedBanner>
            )}

            {state.kind === 'result' && <VerifyOutcome response={state.response} />}
          </div>

          <section className="mt-20 sm:mt-24 border-t border-bg-3 pt-12 sm:pt-16">
            <div className="font-mono text-[11px] uppercase tracking-widest text-fg-4 mb-4">
              <span className="text-fg-5">// </span>what-verification-proves
            </div>
            <h2 className="font-display font-black text-fg-0 text-2xl sm:text-3xl tracking-[-0.025em] leading-tight max-w-2xl">
              What a <span className="text-term-glow">verified</span> result actually means.
            </h2>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-px bg-bg-3 border border-bg-3">
              <TrustCell
                title="Signed by the issuer"
                body="The registry record carries an Ed25519 signature over its canonical JSON. Verification re-checks that signature with the issuer's published public key, so an edited record fails."
              />
              <TrustCell
                title="Graded by the server"
                body="The score in the record was computed by the assessment server from its private answer key. The browser never submits a score and cannot alter the graded result."
              />
              <TrustCell
                title="Revocation is checked"
                body="Every lookup reads the revocation list. A revoked credential is reported as revoked, and an unreachable registry is reported as unavailable — never as valid."
              />
              <TrustCell
                title="What it does not prove"
                body={`Unproctored assessment, self-declared identity. ${CREDENTIAL_DISCLOSURE.accreditation} Independent verification of the person holding the credential is out of scope.`}
              />
            </div>
          </section>

          <div className="mt-16 sm:mt-20 pt-12 border-t border-bg-3">
            <Link to="/">
              <Button variant="ghost" size="lg" cmd>
                back-to-assessments
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    </PageShell>
  );
}

function VerifyOutcome({ response }: { response: VerifyResponse }) {
  const { state, credential, notes } = response;

  if (state === 'registry-unavailable') {
    return (
      <VerifiedBanner state="unverified">
        The credential registry could not be reached, so this credential is <strong className="text-fg-0">not confirmed</strong>.
        This is a temporary condition, not a verdict. {notes.join(' ')}
      </VerifiedBanner>
    );
  }

  if (state === 'unauthenticated-record') {
    return (
      <VerifiedBanner state="unverified">
        A registry record exists, but its signature does not verify. Treat this credential as{' '}
        <strong className="text-fg-0">untrusted</strong> and contact the issuer. {notes.join(' ')}
      </VerifiedBanner>
    );
  }

  if (state === 'not-found' || !credential) {
    return (
      <VerifiedBanner state="unverified">
        No credential with that id exists in the public registry. It may be mistyped, never issued, or issued by a
        different system. {notes.join(' ')}
      </VerifiedBanner>
    );
  }

  const issued = new Date(credential.issuedAt);
  const revoked = state === 'revoked';

  return (
    <div className="space-y-8">
      <VerifiedBanner state={revoked ? 'unverified' : 'authentic'}>
        {revoked ? (
          <>
            This credential was <strong className="text-fg-0">revoked</strong>
            {credential.revocation?.revokedAt ? ` on ${new Date(credential.revocation.revokedAt).toLocaleDateString()}` : ''}
            {credential.revocation?.reason ? ` — ${credential.revocation.reason}` : ''}.
          </>
        ) : (
          <>
            Signature verified against the issuer public key. Status: valid.
            {credential.provenance === 'legacy-unsigned' && (
              <span className="block mt-2 text-warn-500">
                Legacy record: issued before server-side signing, so it is present and unrevoked but cannot be
                cryptographically verified.
              </span>
            )}
          </>
        )}
      </VerifiedBanner>

      <IntegrityPanel
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
          { label: 'issued', value: issued.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) },
          { label: 'issuer', value: credential.issuer.name },
          { label: 'method', value: credential.assessment.method },
          { label: 'assessment id', value: <code className="text-fg-3 break-all">{credential.assessment.blueprintId}</code> },
          { label: 'registry record', value: <code className="text-fg-3 break-all">{credential.registryPath}</code> },
          {
            label: 'skills assessed',
            value:
              credential.credential.skills.length > 0 ? (
                <span className="text-fg-3">{credential.credential.skills.map((s) => s.name).join(' · ')}</span>
              ) : (
                'not recorded'
              ),
          },
        ]}
        sourceLink={
          credential.verifyUrl?.startsWith('http')
            ? { href: credential.verifyUrl, label: 'canonical verification URL' }
            : undefined
        }
      />

      {notes.length > 0 && (
        <ul className="font-mono text-xs text-fg-4 leading-relaxed space-y-1 max-w-2xl">
          {notes.map((note) => (
            <li key={note}>· {note}</li>
          ))}
        </ul>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <Link to={`/cert/${credential.id}`}>
          <Button variant="primary" size="lg" cmd>
            view-full-credential →
          </Button>
        </Link>
      </div>
    </div>
  );
}

function TrustCell({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-bg-0 p-5 sm:p-6">
      <h3 className="font-display font-bold text-fg-0 text-base leading-tight tracking-[-0.01em]">{title}</h3>
      <p className="mt-3 font-mono text-xs text-fg-3 leading-relaxed">{body}</p>
    </div>
  );
}
