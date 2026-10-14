// ────────────────────────────────────────────────────────────
// RRRTX FreeVerse — Assessment levels (shared: server + client)
//
// Policy data lives in shared/levels.json so that the build
// tooling (plain Node ESM) and the app (TypeScript) read the same
// numbers. Never hard-code level thresholds in components.
//
// HONESTY NOTE
//   The levels differ in item-selection policy, passing bar, time
//   budget and prerequisites. They are NOT backed by any
//   independent psychometric study: no item-response calibration,
//   no equating, no proctored observation. `advanced` is an
//   item-selection tier, not an externally validated "expert"
//   credential. Everything we publish says so.
// ────────────────────────────────────────────────────────────

import rawLevels from './levels.json';

export type LevelId = 'foundation' | 'intermediate' | 'advanced';

export interface LevelSpec {
  id: LevelId;
  label: string;
  short: string;
  tagline: string;
  demonstrates: string[];
  selection: {
    questionCount: number;
    perSubPool: number;
    pool: 'approved' | 'approved_or_provisional';
    coverage: 'all' | 'prime';
    preferredTiers: number[];
  };
  passingScore: number;
  durationSec: number;
  requiresLevel: LevelId | null;
  retakeAfterPassHours: number;
  retakeAfterFailHours: number;
  order: number;
}

export const LEVELS = rawLevels as unknown as Record<LevelId, LevelSpec>;
export const LEVEL_ORDER: LevelId[] = ['foundation', 'intermediate', 'advanced'];
export const LEVEL_IDS = LEVEL_ORDER;

export function isLevelId(value: unknown): value is LevelId {
  return typeof value === 'string' && (LEVEL_ORDER as string[]).includes(value);
}

/**
 * What these credentials are NOT. Rendered on assessment pages, the
 * certificate itself and the verification page. Keep factual.
 */
export const CREDENTIAL_DISCLOSURE = {
  issuer: 'RRRTX FreeVerse',
  issuerLegalLine: 'Independently issued by RRRTX FreeVerse / RRRTX Labs.',
  accreditation:
    'Not a degree, diploma or accredited qualification, and not recognised or endorsed by any university, employer or professional body.',
  method:
    'Unproctored, browser-based multiple-choice assessment. Graded server-side against a private answer key.',
  identity:
    'The learner identity is self-declared. The display name on this credential was not independently verified.',
  integrity:
    'Browser-level anti-tampering (fullscreen, tab-switch detection, copy/paste blocking) is advisory and can be bypassed by a determined user. It is not remote proctoring.',
  review:
    'Item quality is maintained by automated validation plus human review of a published rewrite queue. Not every item has been human-reviewed.',
  scoreMeaning:
    'The score is the percentage of items answered correctly in one attempt on this topic. It is not normed against other learners.',
} as const;

// LearnPath integration lives in shared/learnpath.ts (validated mapping table).
// Do not add URL builders here: the previous /learn/<topic> shape did not exist
// on that site, so every link built from it was a 404.

/** Stable skill identifier: rfv.skill.<topic>.<nn>-<slug> */
export function skillId(topicId: string, index: number, name: string): string {
  const slug = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return `rfv.skill.${topicId}.${String(index + 1).padStart(2, '0')}-${slug}`;
}

/** Stable credential definition identifier: rfv.cred.<topic>.<level> */
export function credentialDefinitionId(topicId: string, level: LevelId): string {
  return `rfv.cred.${topicId}.${level}`;
}

/** Stable topic skill identifier: rfv.skill.<topic> */
export function topicSkillId(topicId: string): string {
  return `rfv.skill.${topicId}`;
}
