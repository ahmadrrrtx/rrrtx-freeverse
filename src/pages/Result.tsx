import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { PageShell } from '../components/layout/PageShell';
import { Container } from '../components/atoms/Container';
import { Button } from '../components/atoms/Button';
import { Pill } from '../components/atoms/Pill';
import { Certificate } from '../components/certificate/Certificate';
import { CertActions } from '../components/certificate/CertActions';
import { api, describeError } from '../lib/api';
import {
  cacheCredential,
  clearPendingIssuance,
  findCachedCredential,
  findResultByToken,
  getPendingIssuances,
  getUser,
  queuePendingIssuance,
  type StoredResult,
} from '../lib/attemptSession';
import { CREDENTIAL_DISCLOSURE, LEVELS } from '../../shared/levels';
import type { AttemptResult, PublicCredential } from '../types';

type CredentialState =
  | { kind: 'idle' }
  | { kind: 'issuing' }
  | { kind: 'issued'; credential: PublicCredential; alreadyIssued: boolean }
  | { kind: 'failed'; message: string; retryable: boolean };

export function Result() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const stateToken = (location.state as { resultToken?: string } | null)?.resultToken ?? null;

  const [entry, setEntry] = useState<StoredResult | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [credential, setCredential] = useState<CredentialState>({ kind: 'idle' });
  const paperRef = useRef<HTMLDivElement | null>(null);

  // ── Load the authoritative result ─────────────────────────
  useEffect(() => {
    const cached = stateToken ? findResultByToken(stateToken) : null;
    if (cached) {
      setEntry(cached);
      return;
    }
    const token = stateToken ?? getPendingIssuances().find((p) => p.topicId === id)?.resultToken ?? null;
    if (!token) return;

    void (async () => {
      try {
        const summary = await api.readResult(token);
        const existing = findResultByToken(token);
        setEntry({ result: summary, review: existing?.review ?? [], savedAt: new Date().toISOString() });
      } catch (error) {
        setLoadError(describeError(error));
      }
    })();
  }, [stateToken, id]);

  const result: AttemptResult | null = entry?.result ?? null;

  // ── Issue the credential (server-side, idempotent) ────────
  const issue = useCallback(
    async (target: AttemptResult) => {
      const user = getUser();
      if (!user) return;
      setCredential({ kind: 'issuing' });
      try {
        const response = await api.issueCredential({
          resultToken: target.resultToken,
          recipient: { displayName: user.name, email: user.email },
          idempotencyKey: target.resultToken.slice(0, 24),
        });
        cacheCredential(response.credential);
        clearPendingIssuance(target.resultToken);
        setCredential({ kind: 'issued', credential: response.credential, alreadyIssued: response.alreadyIssued });
      } catch (error) {
        const message = describeError(error);
        const retryable = !/not pass|different recipient|expired/i.test(message);
        queuePendingIssuance({
          resultToken: target.resultToken,
          topicId: target.topicId,
          level: target.level,
          recipient: { displayName: user.name, email: user.email },
          queuedAt: new Date().toISOString(),
        });
        setCredential({ kind: 'failed', message, retryable });
      }
    },
    [],
  );

  useEffect(() => {
    if (!result || !result.passed) return;
    const cached = findCachedCredential('') ?? null;
    void cached;
    // Only issue after the server confirms the attempt passed. Re-running this
    // effect is safe: issuance is idempotent and returns the same credential id.
    void issue(result);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.resultToken]);

  if (!result) {
    return (
      <PageShell>
        <Container size="app">
          <div className="py-32 text-center max-w-md mx-auto">
            <h1 className="font-display font-black text-fg-0 text-3xl leading-tight">No result to show.</h1>
            <p className="mt-4 font-mono text-sm text-fg-3">
              {loadError ?? 'This page shows the result of a submission you just made. Take the assessment to produce one.'}
            </p>
            <div className="mt-8">
              <Link to={`/quiz/${id}`}>
                <Button variant="primary" size="lg" cmd>
                  start-assessment
                </Button>
              </Link>
            </div>
          </div>
        </Container>
      </PageShell>
    );
  }

  const level = LEVELS[result.level];

  return (
    <PageShell>
      <Container size="app">
        <div className="py-14 sm:py-20">
          <div className="font-mono text-[11px] uppercase tracking-widest text-fg-4">
            <span className="text-fg-5">// </span>result · {result.reason === 'submitted' ? 'completed' : result.reason}
          </div>

          <div className="mt-6 flex items-center gap-3 flex-wrap">
            <Pill tone={result.passed ? 'term' : 'err'}>{result.passed ? 'passed' : 'not passed'}</Pill>
            <Pill tone="fg">{level?.label ?? result.level}</Pill>
            {result.integrity.selfReportedViolations > 0 && (
              <Pill tone="warn">
                {result.integrity.selfReportedViolations} self-reported violation
                {result.integrity.selfReportedViolations === 1 ? '' : 's'}
              </Pill>
            )}
          </div>

          <h1 className="mt-6 font-display font-black leading-none tracking-[-0.05em] text-[4.5rem] sm:text-[7rem] lg:text-[9rem]">
            <span className={result.passed ? 'text-term-glow' : 'text-err-500'}>{result.score}</span>
            <span className="text-fg-5 font-mono font-normal text-[0.25em] align-super ml-2">/100</span>
          </h1>

          <p className="mt-5 font-mono text-sm sm:text-base text-fg-3 leading-relaxed max-w-xl">
            <span className="text-fg-5">// </span>
            {result.correctCount} of {result.totalCount} correct · server-graded · pass mark {result.passingScore}%
            {result.durationUsedSec > 0 && <> · submitted in {Math.floor(result.durationUsedSec / 60)}m {result.durationUsedSec % 60}s</>}
          </p>

          {result.integrity.reviewDisclosure === 'aggregate-only' && (
            <div className="mt-8 border border-bg-3 bg-bg-1 p-5 max-w-2xl">
              <p className="font-mono text-xs text-fg-3 leading-relaxed">
                <span className="text-fg-5">// review withheld — </span>
                per-question feedback is not shown when fewer than half of the questions are answered, because that
                pattern extracts the question bank rather than demonstrating learning. You still get the skill
                breakdown below.
              </p>
            </div>
          )}

          {/* ── Credential ── */}
          <section className="mt-16 sm:mt-20" id="cert">
            <div className="font-mono text-[11px] uppercase tracking-widest text-fg-4 mb-6">
              <span className="text-fg-5">// </span>credential
            </div>

            {!result.passed && (
              <div className="border border-bg-3 bg-bg-1 p-6 max-w-2xl">
                <p className="font-mono text-sm text-fg-3 leading-relaxed">
                  No credential is issued for a failed attempt. {result.retake.policy}
                  {result.retake.nextAvailableAt && (
                    <>
                      {' '}
                      Next attempt available{' '}
                      <span className="text-fg-0">
                        {new Date(result.retake.nextAvailableAt).toLocaleString('en-US', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      .
                    </>
                  )}
                </p>
              </div>
            )}

            {result.passed && credential.kind === 'issuing' && (
              <p className="font-mono text-sm text-fg-3 py-12 text-center border border-bg-3 bg-bg-1">
                <span className="text-fg-5">// </span>issuing credential on the server…
              </p>
            )}

            {result.passed && credential.kind === 'failed' && (
              <div className="border border-warn-500/40 bg-bg-1 p-6 max-w-2xl">
                <p className="font-mono text-sm text-fg-2 leading-relaxed">
                  <span className="text-warn-500">// not issued yet — </span>
                  {credential.message} Your score is saved and the credential can be issued without retaking the
                  assessment.
                </p>
                <div className="mt-5">
                  <Button variant="primary" size="lg" cmd onClick={() => void issue(result)}>
                    retry-issuance
                  </Button>
                </div>
              </div>
            )}

            {result.passed && credential.kind === 'issued' && (
              <>
                <div ref={paperRef} id={`cert-export-${credential.credential.id}`}>
                  <Certificate
                    data={{
                      recipientName: credential.credential.subject.displayName,
                      title: credential.credential.credential.title,
                      levelLabel: credential.credential.credential.levelLabel,
                      skills: credential.credential.credential.skills.map((s) => s.name),
                      score: credential.credential.assessment.score,
                      passingScore: credential.credential.assessment.passingScore,
                      credentialId: credential.credential.id,
                      issuedAt: credential.credential.issuedAt,
                      verifyUrl: credential.credential.verifyUrl,
                      status: credential.credential.status,
                      provenance: credential.credential.provenance,
                    }}
                    animated
                  />
                </div>
                <div className="mt-10">
                  <CertActions paperRef={paperRef} credential={credential.credential} />
                </div>
                <p className="mt-8 font-mono text-xs text-fg-5 leading-relaxed max-w-2xl">
                  // credential id: <span className="text-term-glow">{credential.credential.id}</span>
                  <br />// {credential.alreadyIssued ? 'already on record — this is the same credential (issuance is idempotent)' : 'written to the public registry, signed by the issuer key'}
                  <br />// verify: <span className="text-fg-3">{credential.credential.verifyUrl}</span>
                </p>
              </>
            )}
          </section>

          {/* ── Skill feedback ── */}
          <SkillFeedback result={result} />

          {/* ── Retake rules ── */}
          <section className="mt-16 pt-12 border-t border-bg-3">
            <div className="font-mono text-[11px] uppercase tracking-widest text-fg-4 mb-4">
              <span className="text-fg-5">// </span>retake policy
            </div>
            <p className="font-mono text-sm text-fg-3 leading-relaxed max-w-2xl">
              {result.retake.policy}
              {result.retake.nextAvailableAt && (
                <>
                  {' '}
                  Eligible from{' '}
                  <span className="text-fg-0">
                    {new Date(result.retake.nextAvailableAt).toLocaleDateString('en-US', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                  .
                </>
              )}{' '}
              Re-takes draw a different item set and options are re-shuffled.
            </p>
          </section>

          {/* ── Honest disclosure ── */}
          <section className="mt-12 border border-bg-3 bg-bg-1 p-6 max-w-3xl">
            <div className="font-mono text-[11px] uppercase tracking-widest text-fg-4 mb-3">
              <span className="text-fg-5">// </span>what this credential is and is not
            </div>
            <ul className="font-mono text-xs text-fg-3 leading-relaxed space-y-2">
              <li>· {CREDENTIAL_DISCLOSURE.issuerLegalLine}</li>
              <li>· {CREDENTIAL_DISCLOSURE.accreditation}</li>
              <li>· {CREDENTIAL_DISCLOSURE.method}</li>
              <li>· {CREDENTIAL_DISCLOSURE.identity}</li>
              <li>· {CREDENTIAL_DISCLOSURE.integrity}</li>
            </ul>
          </section>

          <div className="mt-16 flex flex-col sm:flex-row gap-3">
            <Link to="/">
              <Button variant="ghost" size="lg" cmd>
                back-to-assessments
              </Button>
            </Link>
            <Link to="/me">
              <Button variant="ghost" size="lg" cmd>
                your-credentials
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    </PageShell>
  );
}

function SkillFeedback({ result }: { result: AttemptResult }) {
  const breakdown = useMemo(() => result.breakdown.filter((b) => b.asked > 0), [result.breakdown]);
  if (!breakdown.length) return null;

  return (
    <section className="mt-16 sm:mt-20">
      <div className="font-mono text-[11px] uppercase tracking-widest text-fg-4 mb-6">
        <span className="text-fg-5">// </span>skills assessed
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-bg-3 border border-bg-3">
        <SkillColumn
          title="strengths"
          tone="term"
          rows={result.strengths.map((s) => ({ name: s.skillName, detail: `${s.correct}/${s.asked} correct` }))}
          empty="No skill reached the pass bar on every item."
        />
        <SkillColumn
          title="needs work"
          tone="warn"
          rows={result.needsWork.map((s) => ({ name: s.skillName, detail: `${s.correct}/${s.asked} correct` }))}
          empty="Nothing below the pass bar — nice."
        />
        <div className="bg-bg-0 p-5 sm:p-6">
          <h3 className="font-mono text-[11px] uppercase tracking-widest text-fg-4">skill breakdown</h3>
          <ul className="mt-4 space-y-2">
            {breakdown.map((skill) => (
              <li key={skill.skillId} className="font-mono text-xs text-fg-3 flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate">{skill.skillName}</span>
                <span className="text-fg-1 shrink-0">
                  {skill.correct}/{skill.asked}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {result.recommendations.length > 0 && (
        <div className="mt-8 border border-bg-3 bg-bg-1 p-5">
          <div className="font-mono text-[11px] uppercase tracking-widest text-fg-4 mb-3">
            <span className="text-fg-5">// </span>weakest skills
          </div>
          <ul className="space-y-2">
            {result.recommendations.map((rec) => (
              <li key={rec.skillId} className="font-mono text-xs text-fg-3">
                <span className="text-fg-1">{rec.skillName}</span> —{' '}
                {Math.round(rec.accuracy * 100)}% on this skill
                {rec.resourceUrl ? (
                  <>
                    {' · '}
                    <a
                      href={rec.resourceUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-term-glow hover:underline break-words"
                    >
                      learn on LearnPath → {rec.resourceLabel ?? 'roadmap'}
                    </a>
                  </>
                ) : (
                  <span className="text-fg-5"> · no matching LearnPath path for this topic yet</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.review.length > 0 && result.review.some((r) => r.correctOption !== null) && (
        <details className="mt-8 border border-bg-3 bg-bg-1">
          <summary className="cursor-pointer p-5 font-mono text-xs uppercase tracking-widest text-fg-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-term-glow">
            <span className="text-fg-5">// </span>review answers ({result.review.filter((r) => r.correctOption !== null).length} disclosed)
          </summary>
          <ul className="px-5 pb-5 space-y-5">
            {result.review.map((item) => (
              <li key={item.ref} className="border-t border-bg-3 pt-4 first:border-t-0 first:pt-0">
                <p className="font-mono text-sm text-fg-1 leading-relaxed">{item.prompt}</p>
                <ul className="mt-3 space-y-1">
                  {item.options.map((option, index) => {
                    const isChosen = item.chosenOption === index;
                    const isCorrect = item.correctOption === index;
                    return (
                      <li
                        key={index}
                        className={`font-mono text-xs leading-relaxed ${
                          isCorrect ? 'text-term-glow' : isChosen ? 'text-err-500' : 'text-fg-4'
                        }`}
                      >
                        {isCorrect ? '✓ ' : isChosen ? '✕ ' : '  '}
                        {option}
                        {isChosen && !isCorrect && ' (your answer)'}
                      </li>
                    );
                  })}
                </ul>
                {item.chosenOption === null && (
                  <p className="mt-2 font-mono text-[11px] text-fg-5">// skipped — answer not disclosed</p>
                )}
                {item.explanation && (
                  <p className="mt-2 font-mono text-xs text-fg-3 leading-relaxed">
                    <span className="text-fg-5">// </span>
                    {item.explanation}
                  </p>
                )}
                <p className="mt-2 font-mono text-[11px] text-fg-5">skill: {item.skillName}</p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function SkillColumn({
  title,
  tone,
  rows,
  empty,
}: {
  title: string;
  tone: 'term' | 'warn';
  rows: { name: string; detail: string }[];
  empty: string;
}) {
  return (
    <div className="bg-bg-0 p-5 sm:p-6">
      <h3 className={`font-mono text-[11px] uppercase tracking-widest ${tone === 'term' ? 'text-term-glow' : 'text-warn-500'}`}>
        {title}
      </h3>
      {rows.length === 0 ? (
        <p className="mt-4 font-mono text-xs text-fg-4">{empty}</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {rows.map((row) => (
            <li key={row.name} className="font-mono text-xs text-fg-3">
              <span className="text-fg-1">{row.name}</span> · {row.detail}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
