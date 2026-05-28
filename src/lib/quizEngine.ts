// ────────────────────────────────────────────────────────────
// RRRTX FreeVerse — Quiz Engine
// Sub-pool randomization (academically validated approach)
// 20 sub-pools × 5 questions each = 100 total, 20 shown per attempt
// Probability of identical attempt: (1/5)^20 ≈ 1 in 95 trillion
// ────────────────────────────────────────────────────────────

import type {
  Quiz,
  Question,
  ShuffledQuestion,
  QuizAttempt,
  QuizResult,
  SecureModeViolation,
} from '../types';

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickFromSubPools(quiz: Quiz): Question[] {
  return quiz.subPools.map((pool) => {
    const idx = Math.floor(Math.random() * pool.questions.length);
    return pool.questions[idx];
  });
}

function shuffleOptions(q: Question): ShuffledQuestion {
  const indexed = q.options.map((opt, i) => ({ opt, i }));
  const shuffled = shuffle(indexed);
  const newCorrectIndex = shuffled.findIndex((x) => x.i === q.answer);
  return {
    originalId: q.id,
    q: q.q,
    options: shuffled.map((x) => x.opt),
    correctOptionIndex: newCorrectIndex,
    explanation: q.explanation,
  };
}

/**
 * Build a fresh quiz attempt:
 *   1. Pick 1 question from each sub-pool (full coverage, random)
 *   2. Shuffle the order of those questions
 *   3. Shuffle the options within each question
 */
export function buildAttempt(quiz: Quiz): QuizAttempt {
  const picked = pickFromSubPools(quiz);
  const shuffledOrder = shuffle(picked);
  const shuffledQuestions = shuffledOrder.map(shuffleOptions);
  const now = Date.now();
  return {
    quizId: quiz.id,
    startedAt: now,
    endsAt: now + quiz.durationSec * 1000,
    questions: shuffledQuestions,
    answers: new Array(shuffledQuestions.length).fill(null),
    violations: [],
  };
}

/**
 * Grade an attempt. Returns score (0-100) and pass/fail + integrity data.
 */
export function gradeAttempt(
  quiz: Quiz,
  attempt: QuizAttempt,
  opts: {
    violations: SecureModeViolation[];
    forceSubmitted?: boolean;
    forceSubmitReason?: string;
  } = { violations: [] },
): QuizResult {
  let correct = 0;
  attempt.questions.forEach((q, i) => {
    if (attempt.answers[i] === q.correctOptionIndex) correct++;
  });
  const total = attempt.questions.length;
  const score = Math.round((correct / total) * 100);
  return {
    quizId: quiz.id,
    score,
    correctCount: correct,
    totalCount: total,
    passed: score >= quiz.passingScore && !opts.forceSubmitted,
    submittedAt: new Date().toISOString(),
    durationUsedSec: Math.round((Date.now() - attempt.startedAt) / 1000),
    violationCount: opts.violations.length,
    forceSubmitted: !!opts.forceSubmitted,
    forceSubmitReason: opts.forceSubmitReason,
  };
}

/**
 * Cooldown:
 *   - Passed:  30 days before retake (avoid cert spam)
 *   - Failed:  24 hours before retry
 *   - Force-submitted (cheated): 7 days
 */
export function getCooldownStatus(
  lastAttempt: { passed: boolean; submittedAt: string; forceSubmitted?: boolean } | null,
): { canRetry: boolean; nextAvailableAt: Date | null } {
  if (!lastAttempt) return { canRetry: true, nextAvailableAt: null };
  const last = new Date(lastAttempt.submittedAt).getTime();
  let cooldownMs: number;
  if (lastAttempt.forceSubmitted) cooldownMs = 7 * 24 * 60 * 60 * 1000;
  else if (lastAttempt.passed)    cooldownMs = 30 * 24 * 60 * 60 * 1000;
  else                            cooldownMs = 24 * 60 * 60 * 1000;
  const next = new Date(last + cooldownMs);
  return {
    canRetry: Date.now() >= next.getTime(),
    nextAvailableAt: next,
  };
}
