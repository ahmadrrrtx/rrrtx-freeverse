import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { loadQuiz } from '../lib/loadQuiz';
import { buildAttempt, gradeAttempt } from '../lib/quizEngine';
import { createSecureMode } from '../lib/secureMode';
import { saveAttempt, loadAttempt, clearAttempt } from '../lib/quizSession';
import { addResult, getUser } from '../lib/storage';
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
import type { Quiz, QuizAttempt, SecureModeViolation } from '../types';

const MAX_VIOLATIONS = 3;
type PageState = 'loading' | 'no-user' | 'not-found' | 'playing' | 'force-submitting';

export function QuizPlayer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [state, setState] = useState<PageState>('loading');
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [gridOpen, setGridOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [abandonOpen, setAbandonOpen] = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  const [lastViolation, setLastViolation] = useState<SecureModeViolation | null>(null);
  const [forceReason, setForceReason] = useState<string | null>(null);

  const secureControllerRef = useRef<ReturnType<typeof createSecureMode> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSubmittingRef = useRef(false);

  // ── Load quiz + restore/build attempt ─────────────────────
  useEffect(() => {
    if (!id) return;
    const user = getUser();
    if (!user) {
      setState('no-user');
      return;
    }
    loadQuiz(id).then((loaded) => {
      if (!loaded) {
        setState('not-found');
        return;
      }
      setQuiz(loaded);
      const restored = loadAttempt(id);
      const fresh = restored ?? buildAttempt(loaded);
      setAttempt(fresh);
      setSecondsLeft(Math.max(0, Math.round((fresh.endsAt - Date.now()) / 1000)));
      setState('playing');
    });
  }, [id]);

  // ── Secure Mode lifecycle ─────────────────────────────────
  useEffect(() => {
    if (state !== 'playing' || !quiz) return;
    const controller = createSecureMode(
      {
        onViolation: (v, total) => {
          setLastViolation(v);
          setViolationCount(total);
        },
        onWarning: () => { /* toast already shows via onViolation */ },
        onForceSubmit: (reason) => {
          if (isSubmittingRef.current) return;
          isSubmittingRef.current = true;
          setForceReason(reason);
          setState('force-submitting');
        },
        onFullscreenChange: () => { /* handled internally by secureMode violations */ },
      },
      { maxViolations: MAX_VIOLATIONS },
    );
    secureControllerRef.current = controller;
    void controller.start();
    return () => {
      controller.stop();
      secureControllerRef.current = null;
    };
  }, [state, quiz]);

  // ── Timer ────────────────────────────────────────────────
  useEffect(() => {
    if (state !== 'playing' || !attempt) return;
    timerRef.current = setInterval(() => {
      const left = Math.max(0, Math.round((attempt.endsAt - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        if (!isSubmittingRef.current) {
          isSubmittingRef.current = true;
          setForceReason('Time limit reached');
          setState('force-submitting');
        }
      }
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state, attempt]);

  // ── Persist answers on every change ──────────────────────
  useEffect(() => {
    if (attempt) saveAttempt(attempt);
  }, [attempt]);

  // ── Derived state ─────────────────────────────────────────
  const answeredStates = useMemo(() => {
    if (!attempt) return [];
    return attempt.answers.map((a) => a !== null);
  }, [attempt]);

  const answeredCount = useMemo(
    () => answeredStates.filter(Boolean).length,
    [answeredStates],
  );

  // ── Handlers ──────────────────────────────────────────────
  const handleSelect = useCallback((optIdx: number) => {
    setAttempt((prev) => {
      if (!prev) return prev;
      const next = [...prev.answers];
      next[currentIdx] = optIdx;
      return { ...prev, answers: next };
    });
  }, [currentIdx]);

  const handleNext = useCallback(() => {
    if (!attempt) return;
    setCurrentIdx((i) => Math.min(i + 1, attempt.questions.length - 1));
  }, [attempt]);

  const handlePrev = useCallback(() => {
    setCurrentIdx((i) => Math.max(i - 1, 0));
  }, []);

  const handleJump = useCallback((idx: number) => {
    setCurrentIdx(idx);
  }, []);

  const finalize = useCallback(
    (opts: { forced: boolean; reason?: string }) => {
      if (!quiz || !attempt) return;
      const violations = secureControllerRef.current?.getViolations() ?? [];
      const result = gradeAttempt(quiz, { ...attempt, violations }, {
        violations,
        forceSubmitted: opts.forced,
        forceSubmitReason: opts.reason,
      });
      addResult(result);
      clearAttempt(quiz.id);
      navigate(`/quiz/${quiz.id}/result`, {
        state: { result, attempt: { ...attempt, violations } },
      });
    },
    [quiz, attempt, navigate],
  );

  const handleSubmit = useCallback(() => {
    setSubmitOpen(true);
  }, []);

  const handleConfirmSubmit = useCallback(() => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setSubmitOpen(false);
    finalize({ forced: false });
  }, [finalize]);

  const handleForceComplete = useCallback(() => {
    finalize({ forced: true, reason: forceReason ?? 'Integrity violation' });
  }, [finalize, forceReason]);

  /**
   * Abandon → discard attempt, exit secure mode, navigate back.
   * NOT a force-submit. No result is recorded. No penalty.
   */
  const handleConfirmAbandon = useCallback(() => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setAbandonOpen(false);
    // Cleanly tear down secure mode (exits fullscreen)
    secureControllerRef.current?.stop();
    if (quiz) clearAttempt(quiz.id);
    navigate(`/quiz/${id}`);
  }, [navigate, id, quiz]);

  // ── Keyboard shortcuts ────────────────────────────────────
  useEffect(() => {
    if (state !== 'playing' || gridOpen || submitOpen || abandonOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        handleSelect(parseInt(e.key, 10) - 1);
        return;
      }
      if (e.key === 'ArrowLeft') { e.preventDefault(); handlePrev(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); handleNext(); }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (attempt && currentIdx === attempt.questions.length - 1) {
          handleSubmit();
        } else {
          handleNext();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state, gridOpen, submitOpen, abandonOpen, currentIdx, attempt, handleSelect, handleNext, handlePrev, handleSubmit]);

  // ─────────────────────────────────────────────────────────
  // RENDER STATES
  // ─────────────────────────────────────────────────────────

  if (state === 'loading') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-bg-0">
        <div className="font-mono text-xs uppercase tracking-widest text-fg-4">
          <span className="text-fg-5">// </span>loading quiz...
        </div>
      </div>
    );
  }

  if (state === 'no-user') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-bg-0 p-6">
        <div className="max-w-md text-center">
          <div className="font-mono text-[11px] uppercase tracking-widest text-fg-4">
            <span className="text-fg-5">// </span>session_required
          </div>
          <h1 className="mt-4 font-display font-black text-fg-0 text-3xl sm:text-4xl leading-tight tracking-tight">
            Set your details first.
          </h1>
          <p className="mt-4 font-mono text-sm text-fg-3 leading-relaxed">
            You need to enter your name and email before starting a quiz.
            This is required for the certificate.
          </p>
          <div className="mt-8">
            <Link to={`/quiz/${id}`}>
              <Button variant="primary" size="lg" cmd>
                go-to-quiz-overview
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (state === 'not-found') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-bg-0 p-6">
        <div className="max-w-md text-center">
          <h1 className="font-display font-black text-fg-0 text-3xl sm:text-4xl leading-tight">
            Quiz not <span className="text-err-500">found.</span>
          </h1>
          <p className="mt-4 font-mono text-sm text-fg-3">
            No quiz with id <code className="text-term-glow">{id}</code>.
          </p>
          <div className="mt-8">
            <Link to="/">
              <Button variant="primary" size="lg" cmd>back-to-quizzes</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!quiz || !attempt) return null;

  const currentQuestion = attempt.questions[currentIdx];
  const currentAnswer = attempt.answers[currentIdx];

  return (
    <div className="flex min-h-dvh flex-col bg-bg-0">
      <SecureModeBar
        secondsLeft={secondsLeft}
        currentIdx={currentIdx}
        totalQuestions={attempt.questions.length}
        answeredStates={answeredStates}
        violationCount={violationCount}
        maxViolations={MAX_VIOLATIONS}
        onExitRequest={() => setAbandonOpen(true)}
      />

      <main className="flex-1 py-10 sm:py-16">
        <Container size="app">
          <QuestionView
            question={currentQuestion}
            number={currentIdx + 1}
            total={attempt.questions.length}
            selected={currentAnswer}
            onSelect={handleSelect}
          />
          <p className="mt-8 hidden lg:block font-mono text-[11px] text-fg-5 leading-relaxed">
            <span>// keyboard: </span>
            <kbd className="text-fg-3">1-4</kbd> select ·{' '}
            <kbd className="text-fg-3">←</kbd>/<kbd className="text-fg-3">→</kbd> navigate ·{' '}
            <kbd className="text-fg-3">Enter</kbd> next
          </p>
        </Container>
      </main>

      <PlayerControls
        currentIdx={currentIdx}
        totalQuestions={attempt.questions.length}
        hasAnsweredCurrent={currentAnswer !== null}
        onPrev={handlePrev}
        onNext={handleNext}
        onOpenGrid={() => setGridOpen(true)}
        onSubmit={handleSubmit}
      />

      {/* Overlays */}
      <QuestionGrid
        open={gridOpen}
        onClose={() => setGridOpen(false)}
        totalQuestions={attempt.questions.length}
        currentIdx={currentIdx}
        answers={attempt.answers}
        onJump={handleJump}
        onSubmit={handleSubmit}
      />

      <SubmitModal
        open={submitOpen}
        totalQuestions={attempt.questions.length}
        answeredCount={answeredCount}
        onConfirm={handleConfirmSubmit}
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

      {state === 'force-submitting' && forceReason && (
        <ForceSubmitOverlay
          reason={forceReason}
          onComplete={handleForceComplete}
        />
      )}
    </div>
  );
}
