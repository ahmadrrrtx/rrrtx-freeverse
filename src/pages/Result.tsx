import { useEffect, useState, useRef, useMemo } from 'react';
import { useLocation, useParams, Link } from 'react-router-dom';
import { PageShell } from '../components/layout/PageShell';
import { Container } from '../components/atoms/Container';
import { Button } from '../components/atoms/Button';
import { Pill } from '../components/atoms/Pill';
import { Certificate } from '../components/certificate/Certificate';
import { CertActions } from '../components/certificate/CertActions';
import { QUIZ_CATALOG } from '../data/quizMeta';
import { generateCertId, hashIntegrity, hashEmail } from '../lib/crypto';
import { getUser, addCertificate, getCertificates } from '../lib/storage';
import { publishToRegistry } from '../lib/githubRegistry';
import type { QuizResult, Certificate as CertificateRecord } from '../types';

export function Result() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const result = (location.state as { result?: QuizResult } | null)?.result ?? null;

  const [cert, setCert] = useState<CertificateRecord | null>(null);
  const paperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!result || !result.passed || !id) return;
    const user = getUser();
    if (!user) return;
    const quiz = QUIZ_CATALOG.find((q) => q.id === id);
    if (!quiz) return;

    const existing = getCertificates().find(
      (c) => c.quiz.id === id && c.recipient.name === user.name && c.score === result.score,
    );
    if (existing) {
      setCert(existing);
      return;
    }

    (async () => {
      const integrityHash = await hashIntegrity({
        violations: result.violationCount,
        completedInSecureMode: true,
      });
      const certId = await generateCertId({
        name: user.name,
        email: user.email,
        quizId: id,
        score: result.score,
        dateISO: result.submittedAt,
        integrityHash,
      });
      const emailHash = await hashEmail(user.email);

      const baseUrl = window.location.origin;
      const record: CertificateRecord = {
        id: certId,
        recipient: { name: user.name, email_hash: emailHash },
        quiz: { id, title: quiz.title, version: '1.0' },
        score: result.score,
        issued_at: result.submittedAt,
        issuer: 'RRRTX FreeVerse',
        verify_url: `${baseUrl}/verify?id=${certId}`,
        integrity: {
          violations: result.violationCount,
          completed_in_secure_mode: true,
        },
      };
      addCertificate(record);
      setCert(record);
      publishToRegistry(record).catch(() => {});
    })();
  }, [id, result]);

  if (!result) {
    return (
      <PageShell>
        <Container size="app">
          <div className="py-32 text-center max-w-md mx-auto">
            <h1 className="font-display font-black text-fg-0 text-3xl leading-tight">
              No result found.
            </h1>
            <p className="mt-4 font-mono text-sm text-fg-3">
              This page expects to be reached after submitting a quiz.
            </p>
            <div className="mt-8">
              <Link to={`/quiz/${id}`}>
                <Button variant="primary" size="lg" cmd>start-fresh</Button>
              </Link>
            </div>
          </div>
        </Container>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <Container size="app">
        {result.passed ? (
          <PassedView result={result} cert={cert} paperRef={paperRef} />
        ) : (
          <FailedView result={result} quizId={id ?? ''} />
        )}
      </Container>
    </PageShell>
  );
}

function PassedView({
  result, cert, paperRef,
}: {
  result: QuizResult;
  cert: CertificateRecord | null;
  paperRef: React.MutableRefObject<HTMLDivElement | null>;
}) {
  const mm = Math.floor(result.durationUsedSec / 60);
  const ss = result.durationUsedSec % 60;
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const certData = useMemo(() => {
    if (!cert) return null;
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

  return (
    <div className="py-16 sm:py-20">
      <div className="font-mono text-[11px] uppercase tracking-widest text-fg-4">
        <span className="text-fg-5">// </span>result · {result.forceSubmitted ? 'force_submitted' : 'completed'}
      </div>
      <div className="mt-6 flex items-center gap-3 flex-wrap">
        <Pill tone="term">passed</Pill>
        {result.forceSubmitted && <Pill tone="warn">force-submitted</Pill>}
        {result.violationCount > 0 && (
          <Pill tone="warn">{result.violationCount} {result.violationCount === 1 ? 'violation' : 'violations'}</Pill>
        )}
      </div>

      <h1 className="
        mt-6 font-display font-black
        text-[5rem] sm:text-[7rem] lg:text-[9rem]
        leading-none tracking-[-0.05em] text-fg-0
      ">
        <span className="text-term-glow">{result.score}</span>
        <span className="text-fg-5 font-mono font-normal text-[0.25em] align-super ml-2">/100</span>
      </h1>

      <p className="mt-5 font-mono text-sm sm:text-base text-fg-3 leading-relaxed max-w-md">
        <span className="text-fg-5">// </span>
        <span className="text-fg-0 font-medium">{result.correctCount}</span> of {result.totalCount} right · finished in {mm}m {ss}s
      </p>

      <section className="mt-16 sm:mt-20 scroll-mt-20" id="cert">
        <div className="font-mono text-[11px] uppercase tracking-widest text-fg-4 mb-6">
          <span className="text-fg-5">// </span>your_certificate
        </div>

        {certData ? (
          <>
            <div ref={paperRef}>
              <Certificate data={certData} animated />
            </div>

            <div className="mt-10">
              <CertActions paperEl={paperRef.current} cert={cert!} baseUrl={baseUrl} />
            </div>

            <p className="mt-10 font-mono text-xs text-fg-5 leading-relaxed max-w-md">
              // certificate id: <span className="text-term-glow">{cert!.id}</span>
              <br />
              // saved to your local certs · registry publish queued
            </p>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 border border-bg-3 bg-bg-1">
            <p className="font-mono text-sm text-fg-4">
              <span className="text-fg-5">// </span>generating certificate...
            </p>
          </div>
        )}
      </section>

      <div className="mt-16 sm:mt-20 pt-12 border-t border-bg-3">
        <Link to="/">
          <Button variant="ghost" size="lg" cmd>back-to-quizzes</Button>
        </Link>
      </div>
    </div>
  );
}

function FailedView({ result, quizId }: { result: QuizResult; quizId: string }) {
  const mm = Math.floor(result.durationUsedSec / 60);
  const ss = result.durationUsedSec % 60;
  const cooldownHours = result.forceSubmitted ? 24 * 7 : 24;
  const cooldownEnd = new Date(new Date(result.submittedAt).getTime() + cooldownHours * 60 * 60 * 1000);

  return (
    <div className="py-16 sm:py-20">
      <div className="font-mono text-[11px] uppercase tracking-widest text-fg-4">
        <span className="text-fg-5">// </span>result · {result.forceSubmitted ? 'force_submitted' : 'not_passed'}
      </div>
      <div className="mt-6 flex items-center gap-3 flex-wrap">
        <Pill tone="err">not passed</Pill>
        {result.forceSubmitted && <Pill tone="warn">force-submitted</Pill>}
      </div>

      <h1 className="
        mt-6 font-display font-black
        text-[5rem] sm:text-[7rem] lg:text-[9rem]
        leading-none tracking-[-0.05em] text-fg-0
      ">
        <span className="text-err-500">{result.score}</span>
        <span className="text-fg-5 font-mono font-normal text-[0.25em] align-super ml-2">/100</span>
      </h1>

      <p className="mt-5 font-mono text-sm sm:text-base text-fg-3 leading-relaxed max-w-md">
        <span className="text-fg-5">// </span>
        you needed <span className="text-fg-0 font-medium">80</span> to pass.{' '}
        got {result.correctCount} of {result.totalCount} right in {mm}m {ss}s.
      </p>

      <div className="mt-10 border border-bg-3 bg-bg-1 p-5 max-w-md">
        <p className="font-mono text-xs text-fg-3 leading-relaxed">
          <span className="text-fg-5">// cooldown</span><br />
          you can retake this quiz on{' '}
          <span className="text-fg-0 font-medium">
            {cooldownEnd.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}{' '}
            at {cooldownEnd.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </span>
          .<br />
          different questions will be drawn from the pool.
        </p>
      </div>

      <div className="mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4">
        <Link to="/">
          <Button variant="primary" size="lg" cmd>browse-other-quizzes</Button>
        </Link>
        <Link to={`/quiz/${quizId}`}>
          <Button variant="ghost" size="lg" cmd>view-quiz-overview</Button>
        </Link>
      </div>
    </div>
  );
}
