// ────────────────────────────────────────────────────────────
// LearnPath integration contract (see shared/learnpath-map.json).
//
// RRRTX FreeVerse and LearnPath are separate applications with
// separate taxonomies. This module is the *only* place that claims a
// relationship between them, and it is deliberately conservative:
//
//   • a mapping is a "learn next" link, never an equivalence claim;
//   • every LearnPath slug is validated against the taxonomy snapshot
//     recorded in learnpath-map.json (repo + commit ref), and must be a
//     node of the roadmap it is linked from;
//   • `npm run integration:check` re-validates the snapshot against the
//     live LearnPath repository;
//   • FreeVerse stays authoritative for assessment, scoring and
//     credential state — LearnPath only receives links and reads
//     /api/verify for status. The direction is one-way.
//
// The old free-form helpers (a `/learn/<topic>` URL built from a
// FreeVerse id) were removed: they looked like deep links but pointed at
// routes LearnPath does not serve, which is worse than no link at all.
// ────────────────────────────────────────────────────────────

import map from './learnpath-map.json';

export interface LearnpathSkillRef {
  id: string;
  title: string;
}

export interface LearnpathEntry {
  roadmap: string;
  confidence: 'high' | 'medium';
  skills: string[];
  note: string;
}

export interface LearnpathTopicMapping {
  topicId: string;
  primaryRoadmap: string;
  entries: LearnpathEntry[];
}

export interface LearnpathUnmapped {
  topicId: string;
  reason: string;
}

interface LearnpathMapFile {
  schema: string;
  generatedAt: string;
  note: string;
  learnpath: {
    repo: string;
    ref: string;
    site: string;
    roadmapPathTemplate: string;
    skillPathTemplate: string;
    skills: LearnpathSkillRef[];
    roadmaps: { id: string; title: string; skills: string[] }[];
  };
  mappings: LearnpathTopicMapping[];
  unmapped: LearnpathUnmapped[];
  deepLinks: Record<string, { roadmap: string; skills: Record<string, string> }>;
}

export const LEARNPATH_MAP = map as unknown as LearnpathMapFile;
export const LEARNPATH_SITE = LEARNPATH_MAP.learnpath.site;
export const LEARNPATH_REF = LEARNPATH_MAP.learnpath.ref;

const SKILL_TITLES = new Map(LEARNPATH_MAP.learnpath.skills.map((s) => [s.id, s.title]));
const MAPPING_BY_TOPIC = new Map(LEARNPATH_MAP.mappings.map((m) => [m.topicId, m]));
const UNMAPPED_BY_TOPIC = new Map(LEARNPATH_MAP.unmapped.map((u) => [u.topicId, u]));
const ROADMAP_TITLES = new Map(LEARNPATH_MAP.learnpath.roadmaps.map((r) => [r.id, r.title]));

export function learnpathSkillTitle(skillId: string): string | null {
  return SKILL_TITLES.get(skillId) ?? null;
}

export function learnpathRoadmapTitle(roadmap: string): string | null {
  return ROADMAP_TITLES.get(roadmap) ?? null;
}

export function learnpathRoadmapUrl(roadmap: string): string {
  return `${LEARNPATH_SITE}/roadmaps/${encodeURIComponent(roadmap)}`;
}

/** Both slugs must exist in the recorded taxonomy; the check runs at build/test time. */
export function learnpathSkillUrl(roadmap: string, skill: string): string {
  return `${LEARNPATH_SITE}/learn/${encodeURIComponent(roadmap)}/${encodeURIComponent(skill)}`;
}

/**
 * The LearnPath skill page for a FreeVerse skill area, when the two taxonomies
 * name the same thing. Returns null when the mapping is only roadmap-level.
 */
export function learnpathDeepLink(
  topicId: string,
  freeverseSkillId: string,
): { roadmap: string; skill: string; title: string | null } | null {
  const deep = LEARNPATH_MAP.deepLinks[topicId];
  const skill = deep?.skills[freeverseSkillId];
  if (!deep || !skill) return null;
  return { roadmap: deep.roadmap, skill, title: SKILL_TITLES.get(skill) ?? null };
}

export function learnpathMapping(topicId: string): LearnpathTopicMapping | null {
  return MAPPING_BY_TOPIC.get(topicId) ?? null;
}

export function learnpathUnmappedReason(topicId: string): string | null {
  return UNMAPPED_BY_TOPIC.get(topicId)?.reason ?? null;
}

/**
 * Best "learn next" URL for an item's skill area: the exact LearnPath skill
 * when the two taxonomies name the same thing, otherwise the topic's primary
 * roadmap, otherwise null (the caller must render text, not a broken link).
 */
export function learnpathResourceUrl(topicId: string, freeverseSkillId: string): string | null {
  const deep = LEARNPATH_MAP.deepLinks[topicId];
  if (deep) {
    const skill = deep.skills[freeverseSkillId];
    if (skill) return learnpathSkillUrl(deep.roadmap, skill);
  }
  const mapping = MAPPING_BY_TOPIC.get(topicId);
  if (mapping) return learnpathRoadmapUrl(mapping.primaryRoadmap);
  return null;
}

/** Every LearnPath slug this project references, for the integrity check. */
export function referencedLearnpathSkills(): string[] {
  const out = new Set<string>();
  for (const m of LEARNPATH_MAP.mappings) for (const e of m.entries) for (const s of e.skills) out.add(s);
  for (const d of Object.values(LEARNPATH_MAP.deepLinks)) for (const s of Object.values(d.skills)) out.add(s);
  return [...out].sort();
}
