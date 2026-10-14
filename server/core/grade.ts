// ────────────────────────────────────────────────────────────
// RRRTX FreeVerse — server-side grading
//
// Score, pass/fail and credential eligibility are computed here,
// from the sealed bank, using the server's own clock and the
// server's own option ordering. Nothing in the request body is
// trusted: `answers` are option positions the server produced
// (rebuilt deterministically from the attempt nonce), and the
// submission reason can only make the outcome stricter.
// ────────────────────────────────────────────────────────────

import { LEVELS, type LevelId } from '../../shared/levels';
import { learnpathDeepLink, learnpathMapping, learnpathResourceUrl, learnpathRoadmapTitle } from '../../shared/learnpath';
import { optionPermutation, type BankTopic } from './bank';
import type { Recommendation } from '../../shared/contracts';
import type { ServerConfig } from './config';
import { ApiError } from './http';
import type { AttemptTokenPayload } from './tokens';

export type SubmitReason = 'submitted' | 'timeout' | 'violations' | 'abandoned';

export interface GradeInput {
  cfg: ServerConfig;
  topic: BankTopic;
  attempt: AttemptTokenPayload;
  /** Option positions in the order the server issued them, aligned with attempt.q */
  answers: (number | null)[];
  reason: SubmitReason;
  selfReportedViolations: number;
  now?: number;
}

export interface ReviewEntry {
  ref: string;
  prompt: string;
  options: string[];
  chosenOption: number | null;
  correctOption: number | null;
  correct: boolean;
  skillId: string;
  skillName: string;
  explanation: string | null;
}

export interface SkillScore {
  skillId: string;
  skillName: string;
  asked: number;
  correct: number;
}

export interface GradeOutput {
  score: number;
  correctCount: number;
  totalCount: number;
  passed: boolean;
  answeredCount: number;
  durationUsedSec: number;
  reviewDisclosure: 'full' | 'aggregate-only';
  review: ReviewEntry[];
  breakdown: SkillScore[];
  strengths: SkillScore[];
  needsWork: SkillScore[];
  recommendations: Recommendation[];
  integrity: {
    selfReportedViolations: number;
    forceSubmitted: boolean;
    answeredShare: number;
    /** Share of served items where the longest option is the correct one (bank property). */
    baselineLongest: number;
  };
}

/**
 * Disclosure policy — a deliberate trade-off between learning value
 * ("why was I wrong?") and item harvesting (taking many attempts to
 * extract the answer key).
 *
 *   • Nothing is disclosed for an abandoned attempt.
 *   • Nothing per-item is disclosed when fewer than half of the items were
 *     answered: that pattern is harvesting, not learning.
 *   • Otherwise the correct option and explanation are disclosed only for items
 *     the learner actually answered; skipped items stay hidden.
 *
 * Residual risk is documented in ASSESSMENT_QUALITY.md §Harvesting.
 */
export function disclosureFor(reason: SubmitReason, answeredCount: number, totalCount: number): 'full' | 'aggregate-only' {
  if (reason === 'abandoned') return 'aggregate-only';
  if (totalCount === 0) return 'aggregate-only';
  return answeredCount / totalCount >= 0.5 ? 'full' : 'aggregate-only';
}

export function gradeAttempt(input: GradeInput): GradeOutput {
  const { cfg, topic, attempt } = input;
  const level = LEVELS[attempt.l as LevelId];
  if (!level) throw new ApiError('bad_request', 'Unknown assessment level.');

  const refs = attempt.q;
  if (!Array.isArray(input.answers) || input.answers.length !== refs.length) {
    throw new ApiError('bad_request', 'The answer sheet does not match the issued assessment.');
  }

  const now = input.now ?? Date.now();
  const durationUsedSec = Math.max(0, Math.min(Math.round((now - attempt.i) / 1000), level.durationSec + 60));

  // ── Rebuild exactly what the server issued ──
  interface Resolved {
    ref: string;
    item: BankTopic['items'][number];
    shuffledOptions: string[];
    correctPosition: number;
    chosen: number | null;
  }

  const resolved: Resolved[] = refs.map((ref, index) => {
    const item = topic.refIndex.get(ref);
    if (!item) throw new ApiError('invalid_attempt', 'The assessment references an unknown question.');
    const permutation = optionPermutation(cfg, attempt.n, ref, item.options.length);
    const shuffledOptions = permutation.map((originalIndex) => item.options[originalIndex]!);
    const correctPosition = permutation.indexOf(item.answerIndex);
    if (correctPosition < 0) throw new ApiError('engine_unavailable', 'Item integrity error while grading.');
    const chosen = input.answers[index];
    if (chosen !== null && (!Number.isInteger(chosen) || chosen < 0 || chosen >= shuffledOptions.length)) {
      throw new ApiError('bad_request', 'The answer sheet contains an out-of-range option index.');
    }
    return { ref, item, shuffledOptions, correctPosition, chosen };
  });

  let correctCount = 0;
  let answeredCount = 0;
  let longestCorrect = 0;
  const perSkill = new Map<string, SkillScore>();

  for (const entry of resolved) {
    const isCorrect = entry.chosen !== null && entry.chosen === entry.correctPosition;
    if (isCorrect) correctCount += 1;
    if (entry.chosen !== null) answeredCount += 1;

    const correctText = entry.item.options[entry.item.answerIndex]!;
    const longest = entry.shuffledOptions.reduce((best, o) => (o.length > best.length ? o : best), '');
    if (correctText.length >= longest.length) longestCorrect += 1;

    const skill = perSkill.get(entry.item.skillId) ?? {
      skillId: entry.item.skillId,
      skillName: entry.item.skillName,
      asked: 0,
      correct: 0,
    };
    skill.asked += 1;
    if (isCorrect) skill.correct += 1;
    perSkill.set(entry.item.skillId, skill);
  }

  const totalCount = resolved.length;
  const score = totalCount === 0 ? 0 : Math.round((correctCount / totalCount) * 100);
  const reviewDisclosure = disclosureFor(input.reason, answeredCount, totalCount);

  // Pass rules: the score must clear the level bar, and a violation- or
  // abandonment-terminated attempt can never pass.
  const passed = score >= level.passingScore && input.reason !== 'violations' && input.reason !== 'abandoned';

  const review: ReviewEntry[] = resolved.map((entry) => {
    const disclose = reviewDisclosure === 'full' && entry.chosen !== null;
    return {
      ref: entry.ref,
      prompt: entry.item.prompt,
      options: entry.shuffledOptions,
      chosenOption: entry.chosen,
      correctOption: disclose ? entry.correctPosition : null,
      correct: entry.chosen !== null && entry.chosen === entry.correctPosition,
      skillId: entry.item.skillId,
      skillName: entry.item.skillName,
      explanation: disclose ? topic.explanations.get(entry.item.id) ?? null : null,
    };
  });

  const breakdown = [...perSkill.values()].sort((a, b) => b.asked - a.asked || a.skillName.localeCompare(b.skillName));
  const accuracyOf = (s: SkillScore) => (s.asked === 0 ? 0 : s.correct / s.asked);

  const threshold = level.passingScore / 100;
  const strengths = breakdown.filter((s) => accuracyOf(s) >= Math.max(threshold, 0.8)).slice(0, 5);
  const needsWork = breakdown
    .filter((s) => accuracyOf(s) < threshold)
    .sort((a, b) => accuracyOf(a) - accuracyOf(b))
    .slice(0, 5);

  // "Learn next" links come from the validated LearnPath mapping (shared/learnpath.ts):
  // an exact skill page when the taxonomies name the same thing, the topic's roadmap
  // otherwise, and null when LearnPath has nothing that covers this topic. Never a
  // guessed URL — the previous implementation linked every skill to a route that
  // LearnPath does not serve.
  const recommendations = breakdown
    .filter((s) => accuracyOf(s) < 1)
    .sort((a, b) => accuracyOf(a) - accuracyOf(b))
    .slice(0, 5)
    .map((s) => {
      const resourceUrl = learnpathResourceUrl(attempt.t, s.skillId);
      const deep = learnpathDeepLink(attempt.t, s.skillId);
      const resourceLabel = resourceUrl === null
        ? null
        : deep
          ? deep.title ?? 'LearnPath skill'
          : learnpathRoadmapTitle(learnpathMapping(attempt.t)?.primaryRoadmap ?? '') ?? 'LearnPath roadmap';
      return {
        skillId: s.skillId,
        skillName: s.skillName,
        accuracy: Number(accuracyOf(s).toFixed(3)),
        resourceUrl,
        resourceLabel,
      };
    });

  return {
    score,
    correctCount,
    totalCount,
    passed,
    answeredCount,
    durationUsedSec,
    reviewDisclosure,
    review,
    breakdown,
    strengths,
    needsWork,
    recommendations,
    integrity: {
      selfReportedViolations: Math.max(0, Math.min(99, Math.trunc(input.selfReportedViolations))),
      forceSubmitted: input.reason === 'violations' || input.reason === 'timeout',
      answeredShare: totalCount === 0 ? 0 : Number((answeredCount / totalCount).toFixed(3)),
      baselineLongest: totalCount === 0 ? 0 : Number((longestCorrect / totalCount).toFixed(4)),
    },
  };
}
