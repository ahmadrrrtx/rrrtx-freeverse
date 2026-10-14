import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, ClientApiError, describeError } from '../lib/api';
import {
  clearAttempt,
  getUser,
  loadAttempt,
  saveAttempt,
  saveResult,
  type StoredAttempt,
} from '../lib/attemptSession';
import { createSecureMode } from '../lib/secureMode';
import { getTopic, levelOf } from '../data/quizMeta';
import { SecureModeBar } from '../components/quiz-player/SecureModeBar';
import { QuestionView } from '../components/quiz-player/QuestionView';
import { PlayerControls } from '../components/quiz-player/PlayerControls';
import { QuestionGrid } from '../components/quiz-player/QuestionGrid';
import { ViolationToast } from '../components/quiz-player/ViolationToast';
import { SubmitModal } from '../components/quiz-player/SubmitModal';
import { AbandonModal } from '../components/quiz-player/AbandonModal';
import { ForceSubmitOverlay } from '../components/quiz-player/ForceSubmitOverlay';
import { Container } from '../components/atoms/Container';
import { Button } from '../components/atoms/Button';
import type { LevelId, SecureModeViolation, SubmitReason } from '../types';

const MAX_VIOLATIONS = 3;
type PageState = 'loading' | 'no-user' | 'not-found' | 'level-unavailable' | 'playing' | 'force-submitting' | 'submitting' | 'error';

export function QuizPlayer() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const requestedLevel = (searchParams.get('level') ?? 'foundation') as LevelId;

  const [state, setState] = useState<PageState>('loading');
  const [attempt, setAttempt] = useState<StoredAttempt | null>(null);
  const [topicTitle, setTopicTitle] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [gridOpen, setGridOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [abandonOpen, setAbandonOpen] = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  const [lastViolation, setLastViolation] = useState<SecureModeViolation | null>(null);
  const [forceReason, setForceReason] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const secureControllerRef = useRef<ReturnType<typeof createSecureMode> | null>(null);
  const submittingRef = useRef(false);
  const attemptRef = useRef<StoredAttempt | null>(null);
  const forceReasonRef = useRef<string | null>(null);

  attemptRef.current = attempt;

  // ── Start or resume a server-issued attempt ───────────────
  useEffect(() => {
    if (!id) return;
    const topic = getTopic(id);
    if (!topic) {
      setState('not-found');
      return;
    }
    setTopicTitle(topic.title);

    const stored = loadAttempt();
    if (stored && stored.topicId === id && stored.endsAt > Date.now()) {
      setAttempt(stored);
      setSecondsLeft(Math.max(0, Math.round((stored.endsAt - Date.now()) / 1000)));
      setState('playing');
      return;
    }
    if (stored) clearAttempt();

    const user = getUser();
    if (!user) {
      setState('no-user');
      return;
    }

    const level = levelOf(topic, requestedLevel);
    if (!level?.available) {
      setState('level-unavailable');
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const started = await api.startAttempt({
          topicId: id,
          level: requestedLevel,
          recipient: { displayName: user.name, email: user.email },
          source: searchParams.get('src') ?? undefined,
        });
        if (cancelled) return;
        const fresh: StoredAttempt = {
          attemptToken: started.attemptToken,
          topicId: started.topicId,
          level: started.level,
          topicTitle: started.topicTitle ?? topic.title,
          questions: started.questions,
          answers: new Array(started.questions.length).fill(null),
          currentIndex: 0,
          startedAt: Date.now(),
          endsAt: new Date(started.expiresAt).getTime(),
          passingScore: started.passingScore,
          violations: 0,
        };
        saveAttempt(fresh);
        setAttempt(fresh);
        setSecondsLeft(Math.max(0, Math.round((fresh.endsAt - Date.now()) / 1000)));
        setState('playing');
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(describeError(error));
        setState('error');
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ── Submit to the server (the only way a result can exist) ──
  const finalize = useCallback(
    async (reason: SubmitReason, reasonLabel?: string) => {
      const current = attemptRef.current;
      if (!current || submittingRef.current) return;
      submittingRef.current = true;
      setState(reason === 'violations' || reason === 'timeout' ? 'force-submitting' : 'submitting');

      const violations = secureControllerRef.current?.getViolations().length ?? 0;
      try {
        const result = await api.submitAttempt({
          attemptToken: current.attemptToken,
          answers: current.answers,
          reason,
          violations,
          clientElapsedSec: Math.round((Date.now() - current.startedAt) / 1000),
        });
        saveResult({ result, review: result.review, savedAt: new Date().toISOString() });
        clearAttempt();
        navigate(`/quiz/${current.topicId}/result`, { state: { resultToken: result.resultToken } });
      } catch (error) {
        submittingRef.current = false;
        const isExpired = error instanceof ClientApiError && (error.code === 'attempt_expired' || error.code === 'invalid_attempt');
        if (isExpired) {
          clearAttempt();
          setAttempt(null);
          setErrorMessage('This attempt had already expired, so it could not be graded. Start a new attempt from the assessment page.');
        } else {
          setErrorMessage(describeError(error));
          setForceReason(null);
          forceReasonRef.current = null;
        }
        setState('error');
        void reasonLabel;
      }
    },
    [navigate],
  );

  // ── Secure Mode (advisory signals only) ───────────────────
  useEffect(() => {
    if (state !== 'playing') return;
    const controller = createSecureMode(
      {
        onViolation: (v, total) => {
          setLastViolation(v);
          setViolationCount(total);
        },
        onWarning: () => {},
        onForceSubmit: (reason) => {
          forceReasonRef.current = reason;
          setForceReason(reason);
          void finalize('violations', reason);
        },
        onFullscreenChange: () => {},
      },
      { maxViolations: MAX_VIOLATIONS },
    );
    secureControllerRef.current = controller;
    void controller.start();
    return () => {
      controller.stop();
      secureControllerRef.current = null;
    };
  }, [state, finalize]);

  // ── Countdown (server deadline, mirrored locally) ─────────
  useEffect(() => {
    if (state !== 'playing' || !attempt) return;
    const tick = window.setInterval(() => {
      const left = Math.max(0, Math.round((attempt.endsAt - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) {
        window.clearInterval(tick);
        setForceReason('Time limit reached');
        forceReasonRef.current = 'Time limit reached';
        void finalize('timeout');
      }
    }, 1000);
    return () => window.clearInterval(tick);
  }, [state, attempt, finalize]);

  // ── Persist answers locally (crash recovery only) ─────────
  useEffect(() => {
    if (attempt && state === 'playing') saveAttempt(attempt);
  }, [attempt, state]);

  const answeredStates = useMemo(
    () => (attempt ? attempt.answers.map((a) => a !== null) : []),
    [attempt],
  );
  const answeredCount = useMemo(() => answeredStates.filter(Boolean).length, [answeredStates]);

  const handleSelect = useCallback((optionIndex: number) => {
    setAttempt((prev) => {
      if (!prev) return prev;
      const next = [...prev.answers];
      next[prev.currentIndex] = optionIndex;
      return { ...prev, answers: next };
    });
  }, []);

  const handleNext = useCallback(() => {
    setAttempt((prev) => (prev ? { ...prev, currentIndex: Math.min(prev.currentIndex + 1, prev.questions.length - 1) } : prev));
  }, []);

  const handlePrev = useCallback(() => {
    setAttempt((prev) => (prev ? { ...prev, currentIndex: Math.max(prev.currentIndex - 1, 0) } : prev));
  }, []);

  const handleJump = useCallback((index: number) => {
    setAttempt((prev) => (prev ? { ...prev, currentIndex: index } : prev));
    setGridOpen(false);
  }, []);

  const handleConfirmAbandon = useCallback(() => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setAbandonOpen(false);
    secureControllerRef.current?.stop();
    clearAttempt();
    navigate(`/quiz/${id}`);
  }, [navigate, id]);

  // ── Keyboard shortcuts ────────────────────────────────────
  useEffect(() => {
    if (state !== 'playing' || gridOpen || submitOpen || abandonOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (['1', '2', '3', '4'].includes(event.key)) {
        event.preventDefault();
        handleSelect(Number.parseInt(event.key, 10) - 1);
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        handlePrev();
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        handleNext();
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        if (attempt && attempt.currentIndex === attempt.questions.length - 1) setSubmitOpen(true);
        else handleNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state, gridOpen, submitOpen, abandonOpen, attempt, handleSelect, handleNext, handlePrev]);

  // ── Render states ─────────────────────────────────────────
  if (state === 'loading' || state === 'submitting') {
    return (
      <CenteredMessage
        label={state === 'loading' ? 'loading assessment' : 'grading on the server'}
        body={
          state === 'loading'
            ? 'Requesting a signed attempt from the assessment server…'
            : 'Your answers were sent to the server. The score you see is computed there, never in this browser.'
        }
      />
    );
  }

  if (state === 'no-user') {
    return (
      <CenteredMessage
        label="details required"
        title="Set your details first."
        body="Your name and email are needed so the credential can be bound to you before the attempt starts."
        action={
          <Link to={`/quiz/${id}`}>
            <Button variant="primary" size="lg" cmd>
              go-to-assessment-overview
            </Button>
          </Link>
        }
      />
    );
  }

  if (state === 'level-unavailable') {
    const topic = getTopic(id);
    const level = topic ? levelOf(topic, requestedLevel) : null;
    return (
      <CenteredMessage
        label="level unavailable"
        title="This level is not open yet."
        body={level?.unavailableReason ?? 'This assessment level is still being reviewed.'}
        action={
          <Link to={`/quiz/${id}`}>
            <Button variant="primary" size="lg" cmd>
              choose-another-level
            </Button>
          </Link>
        }
      />
    );
  }

  if (state === 'not-found') {
    return (
      <CenteredMessage
        label="error 404"
        title="Assessment not found."
        body={`No assessment with id "${id}" exists in the catalog.`}
        action={
          <Link to="/">
            <Button variant="primary" size="lg" cmd>
              back-to-assessments
            </Button>
          </Link>
        }
      />
    );
  }

  if (state === 'error') {
    return (
      <CenteredMessage
        label="could not complete"
        title="That attempt could not be finalised."
        body={errorMessage ?? 'The server rejected the submission.'}
        action={
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to={`/quiz/${id}`}>
              <Button variant="primary" size="lg" cmd>
                restart-assessment
              </Button>
            </Link>
            <Link to="/">
              <Button variant="ghost" size="lg" cmd>
                back-to-assessments
              </Button>
            </Link>
          </div>
        }
      />
    );
  }

  if (!attempt) return null;

  const currentQuestion = attempt.questions[attempt.currentIndex];
  const currentAnswer = attempt.answers[attempt.currentIndex];

  return (
    <div className="flex min-h-dvh flex-col bg-bg-0">
      <SecureModeBar
        secondsLeft={secondsLeft}
        currentIdx={attempt.currentIndex}
        totalQuestions={attempt.questions.length}
        answeredStates={answeredStates}
        violationCount={violationCount}
        maxViolations={MAX_VIOLATIONS}
        onExitRequest={() => setAbandonOpen(true)}
      />

      <main className="flex-1 py-10 sm:py-16">
        <Container size="app">
          <div className="mb-8 font-mono text-[11px] uppercase tracking-widest text-fg-4">
            <span className="text-fg-5">// </span>
            {topicTitle} · {attempt.level} · {attempt.questions.length} questions · server-graded
          </div>

          {currentQuestion && (
            <QuestionView
              question={{ prompt: currentQuestion.prompt, options: currentQuestion.options }}
              number={attempt.currentIndex + 1}
              total={attempt.questions.length}
              selected={currentAnswer}
              onSelect={handleSelect}
            />
          )}

          <p className="mt-8 font-mono text-[11px] text-fg-5 leading-relaxed">
            <span>// </span>
            graded on the server · correct answers are not present in this page ·{' '}
            <span className="text-fg-3">{currentQuestion?.skillName}</span>
          </p>
        </Container>
      </main>

      <PlayerControls
        currentIdx={attempt.currentIndex}
        totalQuestions={attempt.questions.length}
        hasAnsweredCurrent={currentAnswer !== null}
        onPrev={handlePrev}
        onNext={handleNext}
        onOpenGrid={() => setGridOpen(true)}
        onSubmit={() => setSubmitOpen(true)}
      />

      <QuestionGrid
        open={gridOpen}
        onClose={() => setGridOpen(false)}
        totalQuestions={attempt.questions.length}
        currentIdx={attempt.currentIndex}
        answers={attempt.answers}
        onJump={handleJump}
        onSubmit={() => setSubmitOpen(true)}
      />

      <SubmitModal
        open={submitOpen}
        totalQuestions={attempt.questions.length}
        answeredCount={answeredCount}
        onConfirm={() => {
          setSubmitOpen(false);
          void finalize('submitted');
        }}
        onCancel={() => setSubmitOpen(false)}
      />

      <AbandonModal
        open={abandonOpen}
        answeredCount={answeredCount}
        totalQuestions={attempt.questions.length}
        onConfirm={handleConfirmAbandon}
        onCancel={() => setAbandonOpen(false)}
      />

      <ViolationToast
        violation={lastViolation}
        remaining={Math.max(0, MAX_VIOLATIONS - violationCount)}
        onDismiss={() => setLastViolation(null)}
      />

      {state === 'force-submitting' && forceReason && <ForceSubmitOverlay reason={forceReason} onComplete={() => {}} />}
    </div>
  );
}

function CenteredMessage({
  label,
  title,
  body,
  action,
}: {
  label: string;
  title?: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg-0 p-6">
      <div className="max-w-lg text-center">
        <div className="font-mono text-[11px] uppercase tracking-widest text-fg-4">
          <span className="text-fg-5">// </span>
          {label}
        </div>
        {title && (
          <h1 className="mt-4 font-display font-black text-fg-0 text-3xl sm:text-4xl leading-tight tracking-tight">{title}</h1>
        )}
        <p className="mt-4 font-mono text-sm text-fg-3 leading-relaxed">{body}</p>
        {action && <div className="mt-8">{action}</div>}
      </div>
    </div>
  );
}
