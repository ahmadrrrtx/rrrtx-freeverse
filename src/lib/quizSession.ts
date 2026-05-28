// ────────────────────────────────────────────────────────────
// RRRTX FreeVerse — Quiz Session persistence
// Saves the active attempt to sessionStorage so an accidental
// reload (or browser crash) doesn't lose progress.
// Cleared on submit, force-submit, or explicit abandon.
// ────────────────────────────────────────────────────────────

import type { QuizAttempt } from '../types';

const KEY_PREFIX = 'rfv:attempt:';

export function saveAttempt(attempt: QuizAttempt): void {
  try {
    sessionStorage.setItem(KEY_PREFIX + attempt.quizId, JSON.stringify(attempt));
  } catch (e) {
    console.warn('[quizSession] save failed', e);
  }
}

export function loadAttempt(quizId: string): QuizAttempt | null {
  try {
    const raw = sessionStorage.getItem(KEY_PREFIX + quizId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QuizAttempt;
    // If the attempt's deadline has already passed, treat as expired (force-submit)
    if (parsed.endsAt < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearAttempt(quizId: string): void {
  try {
    sessionStorage.removeItem(KEY_PREFIX + quizId);
  } catch {
    /* noop */
  }
}
