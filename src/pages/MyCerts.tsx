import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageShell } from '../components/layout/PageShell';
import { Container } from '../components/atoms/Container';
import { Button } from '../components/atoms/Button';
import { StatTile } from '../components/atoms/StatTile';
import { CertRowCard, type CredentialCheckState } from '../components/me/CertRowCard';
import { AttemptRow } from '../components/me/AttemptRow';
import { ProfileBar } from '../components/me/ProfileBar';
import { api } from '../lib/api';
import { getCachedCredentials, getResults, getUser, resetLocalData } from '../lib/attemptSession';
import { getTopic } from '../data/quizMeta';
import { cn } from '../lib/cn';
import type { PublicCredential } from '../types';

/**
 * /me — learner dashboard.
 *
 * This page lists what this browser remembers. That makes it a
 * cache, not an authority: every credential shown here is
 * re-checked against the server before it is labelled valid, and
 * the "verified" badge can only come from that check.
 */
export function MyCerts() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [resetOpen, setResetOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [checks, setChecks] = useState<Record<string, CredentialCheckState>>({});

  // One snapshot per refresh: local storage reads are synchronous, and the
  // component is re-rendered only when the snapshot changes (refreshKey).
  const { credentials, results, user } = useMemo(() => {
    void refreshKey;
    return {
      credentials: getCachedCredentials(),
      results: [...getResults()].sort((a, b) => Date.parse(b.result.submittedAt) - Date.parse(a.result.submittedAt)),
      user: getUser(),
    };
  }, [refreshKey]);

  // Re-verify every credential against the server (never trust the cache).
  useEffect(() => {
    if (credentials.length === 0) return;
    let cancelled = false;
    setChecks(Object.fromEntries(credentials.map((c) => [c.id, 'checking' as CredentialCheckState])));
    void Promise.all(
      credentials.map(async (credential) => {
        try {
          const response = await api.verify(credential.id);
          const state: CredentialCheckState =
            response.state === 'valid' ? 'valid' : response.state === 'revoked' ? 'revoked' : response.state === 'registry-unavailable' ? 'unavailable' : 'not-found';
          return [credential.id, state] as const;
        } catch {
          return [credential.id, 'unavailable'] as const;
        }
      }),
    ).then((entries) => {
      if (!cancelled) setChecks(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [credentials]);

  const stats = useMemo(() => {
    const totalAttempts = results.length;
    const passedAttempts = results.filter((r) => r.result.passed).length;
    const avgScore = totalAttempts === 0 ? 0 : Math.round(results.reduce((sum, r) => sum + r.result.score, 0) / totalAttempts);
    return { totalCerts: credentials.length, totalAttempts, passedAttempts, avgScore };
  }, [credentials, results]);

  const categories = useMemo(() => {
    const seen = new Set<string>();
    credentials.forEach((c) => seen.add(topicCategory(c)));
    return ['All', ...Array.from(seen).sort()];
  }, [credentials]);

  const filtered = useMemo(
    () => (activeCategory === 'All' ? credentials : credentials.filter((c) => topicCategory(c) === activeCategory)),
    [credentials, activeCategory],
  );

  const handleReset = useCallback(() => {
    resetLocalData();
    setResetOpen(false);
    setRefreshKey((n) => n + 1);
  }, []);

  const isEmpty = credentials.length === 0 && results.length === 0 && !user;

  return (
    <PageShell>
      <Container size="app">
        <div className="py-12 sm:py-16 space-y-12 sm:space-y-16">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-widest text-fg-4">
              <span className="text-fg-5">// </span>your-dashboard
            </div>
            <h1 className="mt-4 font-display font-black text-fg-0 text-[2.25rem] leading-[1.05] tracking-[-0.035em] sm:text-[3rem] sm:leading-[1] lg:text-[3.75rem] lg:tracking-[-0.04em] max-w-[20ch]">
              Your <span className="text-term-glow">credentials.</span>
            </h1>
            <p className="mt-5 font-mono text-fg-3 leading-relaxed text-sm sm:text-base max-w-[44rem]">
              <span className="text-fg-5">// </span>
              This list is a local cache kept in your browser — it is never proof of anything by itself. Each credential
              is re-checked against the public registry on load, and its status badge reflects that check. Export the
              JSON to move your history between devices.
            </p>
          </div>

          {isEmpty && <EmptyState />}

          {!isEmpty && (
            <>
              <ProfileBar user={user} onImportSuccess={() => setRefreshKey((n) => n + 1)} />

              <section>
                <div className="font-mono text-[11px] uppercase tracking-widest text-fg-4 mb-4">
                  <span className="text-fg-5">// </span>summary
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-bg-3 border border-bg-3">
                  <StatTile label="credentials" value={stats.totalCerts} emphasized={stats.totalCerts > 0} />
                  <StatTile label="passed" value={stats.passedAttempts} />
                  <StatTile label="attempts" value={stats.totalAttempts} />
                  <StatTile label="avg score" value={stats.totalAttempts > 0 ? `${stats.avgScore}` : '—'} />
                </div>
              </section>

              <section>
                <div className="flex items-baseline justify-between gap-4 mb-6 flex-wrap">
                  <div>
                    <div className="font-mono text-[11px] uppercase tracking-widest text-fg-4">
                      <span className="text-fg-5">// </span>credentials
                    </div>
                    <h2 className="mt-2 font-display font-black text-fg-0 text-2xl sm:text-3xl leading-tight tracking-[-0.025em]">
                      {credentials.length} {credentials.length === 1 ? 'credential' : 'credentials'}
                    </h2>
                  </div>
                </div>

                {credentials.length === 0 ? (
                  <div className="border border-bg-3 bg-bg-1 p-8 text-center">
                    <p className="font-mono text-sm text-fg-3">
                      <span className="text-fg-5">// </span>no credentials on this device yet — pass an assessment to
                      earn one
                    </p>
                    <div className="mt-5">
                      <Link to="/">
                        <Button variant="primary" size="md" cmd>
                          browse-assessments
                        </Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <>
                    {categories.length > 2 && (
                      <div className="flex gap-2 mb-5 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                        {categories.map((category) => {
                          const isActive = activeCategory === category;
                          const count = category === 'All' ? credentials.length : credentials.filter((c) => topicCategory(c) === category).length;
                          return (
                            <button
                              key={category}
                              type="button"
                              onClick={() => setActiveCategory(category)}
                              className={cn(
                                'shrink-0 inline-flex items-center gap-2 px-3.5 py-2 font-mono text-xs uppercase tracking-wider border transition-colors whitespace-nowrap',
                                isActive ? 'border-term-glow bg-term-soft text-term-glow' : 'border-bg-3 text-fg-3 hover:border-fg-3 hover:text-fg-1',
                              )}
                            >
                              {category.toLowerCase()}
                              <span className={cn('text-[10px] opacity-70', isActive ? 'text-term-glow' : 'text-fg-5')}>{count}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-px bg-bg-3 border border-bg-3">
                      {filtered.map((credential) => (
                        <CertRowCard key={credential.id} credential={credential} check={checks[credential.id] ?? 'checking'} />
                      ))}
                    </div>
                  </>
                )}
              </section>

              {results.length > 0 && (
                <section>
                  <div className="font-mono text-[11px] uppercase tracking-widest text-fg-4 mb-2">
                    <span className="text-fg-5">// </span>attempt-history
                  </div>
                  <h2 className="font-display font-black text-fg-0 text-2xl sm:text-3xl leading-tight tracking-[-0.025em] mb-6">
                    {results.length} {results.length === 1 ? 'attempt' : 'attempts'} on record
                  </h2>
                  <div className="border border-bg-3 bg-bg-0 px-5 py-2">
                    {results.map((entry) => (
                      <AttemptRow key={`${entry.result.resultToken.slice(0, 16)}-${entry.result.submittedAt}`} entry={entry} />
                    ))}
                  </div>
                  <p className="mt-4 font-mono text-xs text-fg-4 leading-relaxed max-w-2xl">
                    <span className="text-fg-5">// </span>
                    scores are the ones the server computed for each signed attempt. Re-open a result to see its
                    server-derived breakdown.
                  </p>
                </section>
              )}

              <section className="border border-err-500/30 bg-err-500/[0.03] p-5 sm:p-6">
                <div className="font-mono text-[11px] uppercase tracking-widest text-err-500 mb-3">
                  <span className="opacity-60">// </span>danger-zone
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 sm:gap-6 sm:items-center">
                  <div>
                    <h3 className="font-display font-bold text-fg-0 text-base sm:text-lg leading-tight">Clear this device</h3>
                    <p className="mt-2 font-mono text-xs text-fg-3 leading-relaxed">
                      <span className="text-fg-5">// </span>
                      removes your profile, credential cache and attempt history from this browser. Credentials already
                      published to the registry are <span className="text-fg-1">not</span> affected — anyone with the id
                      can still verify them. To have a credential revoked, contact the issuer.
                    </p>
                  </div>
                  <Button variant="danger" size="md" onClick={() => setResetOpen(true)}>
                    clear-local-data
                  </Button>
                </div>
              </section>
            </>
          )}
        </div>
      </Container>

      {resetOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-title"
          className="fixed inset-0 z-[80] flex items-center justify-center bg-bg-0/85 backdrop-blur-sm p-4"
          onClick={() => setResetOpen(false)}
        >
          <div className="w-full max-w-md bg-bg-1 border border-err-500/40 p-6 sm:p-7" onClick={(event) => event.stopPropagation()}>
            <div className="font-mono text-[11px] uppercase tracking-widest text-err-500">
              <span className="opacity-60">// </span>confirm_reset
            </div>
            <h2 id="reset-title" className="mt-3 font-display font-black text-fg-0 text-2xl sm:text-3xl leading-tight tracking-[-0.025em]">
              Clear this <span className="text-err-500">device?</span>
            </h2>
            <p className="mt-5 font-mono text-sm text-fg-2 leading-relaxed">
              Your profile, credential cache and attempt history will be removed from this browser. Published credentials
              stay in the public registry.
            </p>
            <div className="mt-4 border border-bg-3 bg-bg-0 p-4">
              <p className="font-mono text-xs text-fg-3 leading-relaxed">
                <span className="text-fg-5">// </span>
                losing this local cache does not invalidate anything — re-import a JSON backup, or look a credential up
                again on <span className="text-fg-1">/verify</span> by its id.
              </p>
            </div>
            <div className="mt-7 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <Button variant="ghost" size="md" onClick={() => setResetOpen(false)}>
                keep-my-data
              </Button>
              <Button variant="danger" size="md" onClick={handleReset}>
                clear-everything
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

function topicCategory(credential: PublicCredential): string {
  return getTopic(credential.credential.topicId)?.category ?? credential.credential.topicId;
}

function EmptyState() {
  return (
    <section className="border border-bg-3 bg-bg-1 p-8 sm:p-12 text-center">
      <div className="font-mono text-[11px] uppercase tracking-widest text-fg-4 mb-3">
        <span className="text-fg-5">// </span>empty_dashboard
      </div>
      <h2 className="font-display font-black text-fg-0 text-2xl sm:text-3xl leading-tight tracking-[-0.025em] max-w-md mx-auto">
        Nothing here <span className="text-term-glow">yet.</span>
      </h2>
      <p className="mt-4 font-mono text-sm text-fg-3 leading-relaxed max-w-sm mx-auto">
        Pass an assessment to earn your first credential, or import a JSON backup from another device.
      </p>
      <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
        <Link to="/">
          <Button variant="primary" size="lg" cmd>
            start-an-assessment →
          </Button>
        </Link>
      </div>
    </section>
  );
}
