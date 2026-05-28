// ────────────────────────────────────────────────────────────
// RRRTX FreeVerse — Quiz loader
// Dynamic import per quiz id so each JSON only loads when needed.
// Vite/Rollup will code-split each quiz into its own chunk.
// ────────────────────────────────────────────────────────────

import type { Quiz } from '../types';

// Cache loaded quizzes so we don't re-fetch on remount
const cache = new Map<string, Quiz>();

export async function loadQuiz(id: string): Promise<Quiz | null> {
  if (cache.has(id)) return cache.get(id) ?? null;

  try {
    // Vite handles dynamic JSON imports at build time per file
    const module = await import(`../quizzes/${id}.json`);
    const quiz = (module.default ?? module) as Quiz;
    cache.set(id, quiz);
    return quiz;
  } catch (e) {
    console.error(`[loadQuiz] could not load ${id}`, e);
    return null;
  }
}
