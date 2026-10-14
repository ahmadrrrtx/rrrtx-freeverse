// ────────────────────────────────────────────────────────────
// RRRTX FreeVerse — quiz catalog (derived, never hand-edited)
//
// The catalog is generated from the sealed bank by
// `npm run bank:build` and contains ONLY public metadata: titles,
// descriptions, skills, level availability and measured quality
// statistics. No questions, no answer keys — those live server-side
// (server/bank/) and are never bundled into the browser.
// ────────────────────────────────────────────────────────────

import rawCatalog from './bankCatalog.json';
import type { Catalog, CatalogLevel, CatalogTopic, LevelId, QuizMeta } from '../types';

export const CATALOG = rawCatalog as unknown as Catalog;

/** Backwards-compatible shape used by the landing grid and legacy screens. */
export const QUIZ_CATALOG: QuizMeta[] = CATALOG.topics.map((topic) => {
  const foundation = levelOf(topic, 'foundation') ?? topic.levels[0];
  return {
    id: topic.id,
    title: topic.title,
    description: topic.description,
    category: topic.category,
    icon: topic.icon,
    estimatedMinutes: topic.estimatedMinutes,
    totalQuestions: topic.questionCount,
    perAttempt: foundation?.questionCount ?? 20,
  };
});

export const CATEGORIES: string[] = [
  'All',
  ...Array.from(new Set(CATALOG.topics.map((t) => t.category))).sort(),
];

export function getTopic(id: string | undefined): CatalogTopic | null {
  if (!id) return null;
  return CATALOG.topics.find((t) => t.id === id) ?? null;
}

export function levelOf(topic: CatalogTopic, level: LevelId): CatalogLevel | undefined {
  return topic.levels.find((l) => l.id === level);
}

export function availableLevels(topic: CatalogTopic): CatalogLevel[] {
  return topic.levels.filter((l) => l.available);
}

/** Topics whose item bank has not passed the automated quality gate yet. */
export function topicsUnderQualityReview(): CatalogTopic[] {
  return CATALOG.topics.filter((t) => t.quality.assessmentIntegrity !== 'verified');
}

/** Topics where "always pick the longest option" alone can still reach the pass mark. */
export function topicsWithLengthHeuristicRisk(): CatalogTopic[] {
  return CATALOG.topics.filter((t) => t.quality.lengthHeuristicRisk);
}

/** The legacy/landing shape for one topic (kept so existing screens keep working). */
export function getTopicQuizMeta(topic: CatalogTopic): QuizMeta {
  const foundation = levelOf(topic, 'foundation') ?? topic.levels[0];
  return {
    id: topic.id,
    title: topic.title,
    description: topic.description,
    category: topic.category,
    icon: topic.icon,
    estimatedMinutes: topic.estimatedMinutes,
    totalQuestions: topic.questionCount,
    perAttempt: foundation?.questionCount ?? 20,
  };
}

/** 1-based position of a topic in the catalog. */
export function topicPosition(topicId: string): number {
  const at = CATALOG.topics.findIndex((t) => t.id === topicId);
  return at >= 0 ? at + 1 : 1;
}

export const CATALOG_TOTALS = {
  topics: CATALOG.topics.length,
  levels: CATALOG.topics.length > 0 ? CATALOG.topics[0]!.levels.length : 3,
  questions: CATALOG.topics.reduce((sum, t) => sum + t.questionCount, 0),
  approvedItems: CATALOG.topics.reduce((sum, t) => sum + t.quality.approved, 0),
  provisionalItems: CATALOG.topics.reduce((sum, t) => sum + t.quality.provisional, 0),
  bankVersion: CATALOG.bankVersion,
  generatedAt: CATALOG.generatedAt,
};
