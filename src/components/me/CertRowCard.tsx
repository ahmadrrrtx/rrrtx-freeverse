import { Link } from 'react-router-dom';
import type { PublicCredential } from '../../types';

export type CredentialCheckState = 'checking' | 'valid' | 'revoked' | 'unavailable' | 'not-found' | 'unknown';

interface CertRowCardProps {
  credential: PublicCredential;
  check: CredentialCheckState;
}

const CHECK_LABEL: Record<CredentialCheckState, { text: string; className: string }> = {
  checking: { text: 'checking…', className: 'text-fg-4 border-bg-3' },
  valid: { text: 'valid · signature verified', className: 'text-term-glow border-term-glow/40 bg-term-soft' },
  revoked: { text: 'revoked', className: 'text-err-500 border-err-500/40 bg-err-500/10' },
  unavailable: { text: 'registry unavailable', className: 'text-warn-500 border-warn-500/40 bg-warn-500/10' },
  'not-found': { text: 'not found in registry', className: 'text-err-500 border-err-500/40 bg-err-500/10' },
  unknown: { text: 'not checked', className: 'text-fg-4 border-bg-3' },
};

/**
 * CertRowCard — one credential in the learner's dashboard.
 *
 * The badge reflects a live server check against the public
 * registry, not a local copy: a credential cached in this browser
 * is never presented as verified on its own.
 */
export function CertRowCard({ credential, check }: CertRowCardProps) {
  const issued = new Date(credential.issuedAt).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const badge = CHECK_LABEL[check];

  return (
    <Link
      to={`/cert/${credential.id}`}
      className="group block bg-bg-0 hover:bg-bg-1 transition-colors border border-bg-3 p-5 sm:p-6"
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="font-mono text-[11px] uppercase tracking-widest text-fg-4">
            <span className="text-fg-5">// </span>
            {credential.credential.levelLabel} · {credential.credential.topicId}
          </div>
          <h3 className="mt-2 font-display font-black text-fg-0 text-lg sm:text-xl leading-tight tracking-[-0.02em] break-words">
            {credential.credential.title}
          </h3>
          <p className="mt-2 font-mono text-xs text-fg-4 break-all">
            {credential.id} · issued {issued} · score {credential.assessment.score}/100
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className={`font-mono text-[11px] uppercase tracking-widest border px-2.5 py-1 ${badge.className}`}>
            {badge.text}
          </span>
          <span className="font-mono text-[11px] text-fg-4 group-hover:text-term-glow transition-colors">
            view →
          </span>
        </div>
      </div>
    </Link>
  );
}
