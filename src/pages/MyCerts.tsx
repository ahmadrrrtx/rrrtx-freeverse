import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PageShell } from '../components/layout/PageShell';
import { Container } from '../components/atoms/Container';
import { Button } from '../components/atoms/Button';
import { StatTile } from '../components/atoms/StatTile';
import { Pill } from '../components/atoms/Pill';
import { CertRowCard } from '../components/me/CertRowCard';
import { AttemptRow } from '../components/me/AttemptRow';
import { ProfileBar } from '../components/me/ProfileBar';
import { getUser, getCertificates, getResults } from '../lib/storage';
import { QUIZ_CATALOG } from '../data/quizMeta';
import { cn } from '../lib/cn';

/**
 * /me — Personal dashboard.
 *
 * Sections:
 *   1. ProfileBar      — name + email + export/import
 *   2. StatBoard       — 4 metrics: total certs, passed, attempts, avg score
 *   3. Certificates    — category filter + list of earned certs
 *   4. Quiz history    — chronological table of all attempts
 *   5. Danger zone     — reset all data (with confirm)
 *
 * Everything reads from localStorage via the storage.ts module.
 * No server fetches, no auth — pure client-side personal data.
 */
export function MyCerts() {
  // Re-render trigger after import/reset
  const [refreshKey, setRefreshKey] = useState(0);
  const [resetOpen, setResetOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('All');

  // Read fresh data on every render
  const user = useMemo(() => getUser(), [refreshKey]);
  const certs = useMemo(() => {
    const list = getCertificates();
    // Sort newest first
    return [...list].sort((a, b) =>
      new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime(),
    );
  }, [refreshKey]);
  const results = useMemo(() => {
    const list = getResults();
    return [...list].sort((a, b) =>
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
    );
  }, [refreshKey]);

  // Stats
  const stats = useMemo(() => {
    const totalCerts = certs.length;
    const totalAttempts = results.length;
    const passedAttempts = results.filter((r) => r.passed).length;
    const avgScore = results.length === 0
      ? 0
      : Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length);
    return { totalCerts, totalAttempts, passedAttempts, avgScore };
  }, [certs, results]);

  // Categories present in earned certs
  const availableCategories = useMemo(() => {
    const seen = new Set<string>();
    certs.forEach((c) => {
      const q = QUIZ_CATALOG.find((qz) => qz.id === c.quiz.id);
      if (q) seen.add(q.category);
    });
    return ['All', ...Array.from(seen)];
  }, [certs]);

  // Filter certs by category
  const filteredCerts = useMemo(() => {
    if (activeCategory === 'All') return certs;
    return certs.filter((c) => {
      const q = QUIZ_CATALOG.find((qz) => qz.id === c.quiz.id);
      return q?.category === activeCategory;
    });
  }, [certs, activeCategory]);

  function handleResetAll() {
    try {
      ['rfv:user', 'rfv:results', 'rfv:certificates'].forEach((k) => localStorage.removeItem(k));
      // Also clear any in-progress quiz sessions
      Object.keys(sessionStorage).forEach((k) => {
        if (k.startsWith('rfv:attempt:')) sessionStorage.removeItem(k);
      });
      setResetOpen(false);
      setRefreshKey((n) => n + 1);
    } catch (e) {
      console.error('Reset failed', e);
    }
  }

  const isEmpty = certs.length === 0 && results.length === 0 && !user;

  return (
    <PageShell>
      <Container size="app">
        <div className="py-12 sm:py-16 space-y-12 sm:space-y-16">

          {/* HEADER */}
          <div>
            <div className="font-mono text-[11px] uppercase tracking-widest text-fg-4">
              <span className="text-fg-5">// </span>your-dashboard
            </div>
            <h1 className="
              mt-4 font-display font-black text-fg-0
              text-[2.25rem] leading-[1.05] tracking-[-0.035em]
              sm:text-[3rem] sm:leading-[1]
              lg:text-[3.75rem] lg:tracking-[-0.04em]
              max-w-[20ch]
            ">
              Your <span className="text-term-glow">certificates.</span>
            </h1>
            <p className="
              mt-5 font-mono text-fg-3 leading-relaxed
              text-sm sm:text-base
              max-w-[40rem]
            ">
              <span className="text-fg-5">// </span>
              Stored locally on this device. Export to a JSON file to sync to other devices —
              no account needed, no server.
            </p>
          </div>

          {/* EMPTY STATE */}
          {isEmpty && <EmptyState />}

          {!isEmpty && (
            <>
              {/* PROFILE BAR */}
              <ProfileBar user={user} onImportSuccess={() => setRefreshKey((n) => n + 1)} />

              {/* STATS */}
              <section>
                <div className="font-mono text-[11px] uppercase tracking-widest text-fg-4 mb-4">
                  <span className="text-fg-5">// </span>summary
                </div>
                <div className="
                  grid grid-cols-2 sm:grid-cols-4
                  gap-px bg-bg-3 border border-bg-3
                ">
                  <StatTile label="certificates" value={stats.totalCerts} emphasized={stats.totalCerts > 0} />
                  <StatTile label="passed" value={stats.passedAttempts} />
                  <StatTile label="attempts" value={stats.totalAttempts} />
                  <StatTile label="avg score" value={stats.totalAttempts > 0 ? `${stats.avgScore}` : '—'} />
                </div>
              </section>

              {/* CERTIFICATES */}
              <section>
                <div className="flex items-baseline justify-between gap-4 mb-6 flex-wrap">
                  <div>
                    <div className="font-mono text-[11px] uppercase tracking-widest text-fg-4">
                      <span className="text-fg-5">// </span>certificates
                    </div>
                    <h2 className="
                      mt-2 font-display font-black text-fg-0
                      text-2xl sm:text-3xl leading-tight tracking-[-0.025em]
                    ">
                      Earned {certs.length} {certs.length === 1 ? 'cert' : 'certs'}
                    </h2>
                  </div>
                </div>

                {certs.length === 0 ? (
                  <div className="border border-bg-3 bg-bg-1 p-8 text-center">
                    <p className="font-mono text-sm text-fg-3">
                      <span className="text-fg-5">// </span>
                      no certificates yet — pass a quiz to earn one
                    </p>
                    <div className="mt-5">
                      <Link to="/">
                        <Button variant="primary" size="md" cmd>browse-quizzes</Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Category filter */}
                    {availableCategories.length > 2 && (
                      <div className="
                        flex gap-2 mb-5 overflow-x-auto pb-2
                        [scrollbar-width:none] [-ms-overflow-style:none]
                        [&::-webkit-scrollbar]:hidden
                      ">
                        {availableCategories.map((cat) => {
                          const isActive = activeCategory === cat;
                          const count = cat === 'All'
                            ? certs.length
                            : certs.filter((c) => {
                                const q = QUIZ_CATALOG.find((qz) => qz.id === c.quiz.id);
                                return q?.category === cat;
                              }).length;
                          return (
                            <button
                              key={cat}
                              onClick={() => setActiveCategory(cat)}
                              className={cn(
                                'shrink-0 inline-flex items-center gap-2',
                                'px-3.5 py-2 font-mono text-xs uppercase tracking-wider',
                                'border transition-colors duration-snap whitespace-nowrap',
                                isActive
                                  ? 'border-term-glow bg-term-soft text-term-glow'
                                  : 'border-bg-3 text-fg-3 hover:border-fg-3 hover:text-fg-1',
                              )}
                            >
                              {cat.toLowerCase()}
                              <span className={cn(
                                'text-[10px] opacity-70',
                                isActive ? 'text-term-glow' : 'text-fg-5',
                              )}>
                                {count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Cert list — 1px gap reveals border via bg-3 */}
                    <div className="grid grid-cols-1 gap-px bg-bg-3 border border-bg-3">
                      {filteredCerts.map((cert) => (
                        <CertRowCard key={cert.id} cert={cert} />
                      ))}
                    </div>
                  </>
                )}
              </section>

              {/* QUIZ HISTORY */}
              {results.length > 0 && (
                <section>
                  <div className="font-mono text-[11px] uppercase tracking-widest text-fg-4 mb-2">
                    <span className="text-fg-5">// </span>quiz-history
                  </div>
                  <h2 className="
                    font-display font-black text-fg-0
                    text-2xl sm:text-3xl leading-tight tracking-[-0.025em] mb-6
                  ">
                    {results.length} {results.length === 1 ? 'attempt' : 'attempts'} on record
                  </h2>

                  <div className="border border-bg-3 bg-bg-3">
                    {/* Table head (desktop only) */}
                    <div className="
                      hidden sm:grid sm:grid-cols-[1fr_auto_auto_auto]
                      gap-6 px-5 py-3 bg-bg-1
                      font-mono text-[10px] uppercase tracking-widest text-fg-4
                    ">
                      <div>quiz</div>
                      <div>when</div>
                      <div className="text-right">score</div>
                      <div>status</div>
                    </div>

                    {/* Rows */}
                    <div className="grid grid-cols-1 gap-px bg-bg-3">
                      {results.map((r, idx) => (
                        <AttemptRow key={`${r.quizId}-${r.submittedAt}-${idx}`} result={r} />
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {/* DANGER ZONE */}
              <section className="border border-err-500/30 bg-err-500/[0.03] p-5 sm:p-6">
                <div className="font-mono text-[11px] uppercase tracking-widest text-err-500 mb-3">
                  <span className="opacity-60">// </span>danger-zone
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 sm:gap-6 sm:items-center">
                  <div>
                    <h3 className="font-display font-bold text-fg-0 text-base sm:text-lg leading-tight">
                      Reset all local data
                    </h3>
                    <p className="mt-2 font-mono text-xs text-fg-3 leading-relaxed">
                      <span className="text-fg-5">// </span>
                      deletes your profile, certificates, and quiz history from this device.
                      certificates already in the public registry are NOT removed —
                      they remain verifiable by anyone with the cert id.
                    </p>
                  </div>
                  <Button variant="danger" size="md" onClick={() => setResetOpen(true)}>
                    reset everything
                  </Button>
                </div>
              </section>
            </>
          )}
        </div>
      </Container>

      {/* Reset confirmation modal */}
      {resetOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="
            fixed inset-0 z-[80] flex items-center justify-center
            bg-bg-0/85 backdrop-blur-sm p-4 animate-fade-in
          "
          onClick={() => setResetOpen(false)}
        >
          <div
            className="w-full max-w-md bg-bg-1 border border-err-500/40 p-6 sm:p-7 animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="font-mono text-[11px] uppercase tracking-widest text-err-500">
              <span className="opacity-60">// </span>confirm_reset
            </div>
            <h2 className="
              mt-3 font-display font-black text-fg-0
              text-2xl sm:text-3xl leading-tight tracking-[-0.025em]
            ">
              Delete <span className="text-err-500">everything?</span>
            </h2>
            <p className="mt-5 font-mono text-sm text-fg-2 leading-relaxed">
              This will remove your profile, all certificates, and your full quiz history
              from this browser.
            </p>
            <div className="mt-4 border border-bg-3 bg-bg-0 p-4">
              <p className="font-mono text-xs text-fg-3 leading-relaxed">
                <span className="text-fg-5">// </span>
                certificates published to the public registry are <span className="text-fg-1">not</span> affected.
                anyone with the cert id can still verify them.
              </p>
            </div>
            <div className="mt-7 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <Button variant="ghost" size="md" onClick={() => setResetOpen(false)}>
                keep my data
              </Button>
              <Button variant="danger" size="md" onClick={handleResetAll}>
                delete everything
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

// ─────────────────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <section className="border border-bg-3 bg-bg-1 p-8 sm:p-12 text-center">
      <div className="font-mono text-[11px] uppercase tracking-widest text-fg-4 mb-3">
        <span className="text-fg-5">// </span>empty_dashboard
      </div>
      <h2 className="
        font-display font-black text-fg-0
        text-2xl sm:text-3xl leading-tight tracking-[-0.025em]
        max-w-md mx-auto
      ">
        Nothing here <span className="text-term-glow">yet.</span>
      </h2>
      <p className="
        mt-4 font-mono text-sm text-fg-3 leading-relaxed
        max-w-sm mx-auto
      ">
        Take a quiz to earn your first certificate.
        Or import a JSON backup from another device.
      </p>
      <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
        <Link to="/">
          <Button variant="primary" size="lg" cmd>start-a-quiz →</Button>
        </Link>
      </div>
    </section>
  );
}
