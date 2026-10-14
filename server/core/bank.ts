// ────────────────────────────────────────────────────────────
// RRRTX FreeVerse — sealed question bank (server-only)
//
// The bank ships in the repository but the ANSWER KEY does not:
// each item stores an HMAC commitment over (id, option index,
// option text) plus an AES-256-GCM encrypted explanation, both
// keyed by FREEVERSE_BANK_KEY (a server-only env secret). Grading
// therefore requires the server secret, which the browser never
// receives, and the key cannot be brute-forced offline (4 options,
// PRF).
//
// Each topic file is also HMAC-sealed, so editing a stored item
// (for example swapping two options) makes the file refuse to load
// instead of silently changing which answer is correct.
// ────────────────────────────────────────────────────────────

import { createHash, randomInt } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LEVELS, LEVEL_ORDER, type LevelId } from '../../shared/levels';
import type { ServerConfig } from './config';
import { answerCommit, canonical, decryptExplanation, hkdf, hmacHex, itemRef } from './crypto';
import { ApiError, logEvent } from './http';

export const DEV_BANK_KEY = 'rfv-dev-bank-key-not-for-production';

interface SealedItem {
  id: string;
  prompt: string;
  options: string[];
  answer_commit: string;
  explanation_enc: string;
  difficulty: { tier: number; signals: string[]; method: string };
  review: { status: 'approved' | 'provisional' | 'rejected'; method: string; human_reviewed: boolean };
  length_ratio: number;
  findings: { code: string; severity: string }[];
}

interface SealedPool {
  index: number;
  name: string;
  skill_id: string;
  items: SealedItem[];
}

interface SealedTopic {
  schema: string;
  sealed_with: string;
  seal: string;
  topic: {
    id: string;
    title: string;
    description: string;
    category: string;
    icon: string;
    estimated_minutes: number;
    version: string;
  };
  sub_pools: SealedPool[];
}

export interface BankItem {
  id: string;
  prompt: string;
  options: string[];
  answerIndex: number;
  ref: string;
  skillIndex: number;
  skillId: string;
  skillName: string;
  tier: number;
  reviewStatus: 'approved' | 'provisional' | 'rejected';
  lengthRatio: number;
}

export interface BankTopic {
  id: string;
  title: string;
  version: string;
  estimatedMinutes: number;
  skills: { skillId: string; name: string; index: number }[];
  items: BankItem[];
  refIndex: Map<string, BankItem>;
  explanations: Map<string, string>;
  keyId: string;
}

export interface BankManifestTopic {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  estimatedMinutes: number;
  skillId: string;
  questionCount: number;
  skills: { skillId: string; name: string; index: number; items: number; approved: number; serviceable: number }[];
  levels: Record<
    string,
    {
      available: boolean;
      reason?: string;
      blueprintId: string;
      skillCoverage: { assessed: number; total: number; minRequired: number };
    }
  >;
  quality: {
    approved: number;
    provisional: number;
    rejected: number;
    longestOptionBaseline: number;
    servableBaseline: number;
    approvedBaseline: number;
    lengthHeuristicRisk: boolean;
    assessmentIntegrity: 'verified' | 'under-review';
    findingsByCode: Record<string, number>;
  };
}

export interface BankManifest {
  schema: string;
  bankVersion: string;
  generatedAt: string;
  keyId: string;
  devSealed?: boolean;
  topics: BankManifestTopic[];
  totals: { topics: number; questions: number; approved: number; provisional: number; rejected: number };
}

/** Matches the key-id derivation in scripts/lib/bank.mjs. */
export function bankKeyId(material: string): string {
  return createHash('sha256').update(material, 'utf8').digest('hex').slice(0, 8);
}

// ── Path resolution ─────────────────────────────────────────
// Vercel Node functions run with cwd=/var/task and files listed in
// vercel.json → functions.includeFiles land relative to it.
const BANK_DIR_CACHE = { dir: null as string | null };

export function bankDir(): string {
  if (BANK_DIR_CACHE.dir) return BANK_DIR_CACHE.dir;
  const envDir = typeof process !== 'undefined' ? process.env?.FREEVERSE_BANK_DIR : undefined;
  const candidates = [
    envDir,
    typeof process !== 'undefined' ? join(process.cwd(), 'server', 'bank') : null,
    typeof process !== 'undefined' && process.env?.LAMBDA_TASK_ROOT
      ? join(process.env.LAMBDA_TASK_ROOT, 'server', 'bank')
      : null,
  ].filter((c): c is string => Boolean(c));

  for (const dir of candidates) {
    if (existsSync(join(dir, 'manifest.json'))) {
      BANK_DIR_CACHE.dir = dir;
      return dir;
    }
  }
  throw new ApiError('engine_unavailable', 'The assessment engine is not deployed correctly (question bank missing).');
}

const manifestCache: { value: BankManifest | null; dir: string | null } = { value: null, dir: null };
const topicCache = new Map<string, BankTopic>();

/** Test seam: drop cached bank state so a tampered copy can be re-read. */
export function __resetBankCacheForTests(): void {
  BANK_DIR_CACHE.dir = null;
  manifestCache.value = null;
  manifestCache.dir = null;
  topicCache.clear();
}

export function loadManifest(): BankManifest {
  const dir = bankDir();
  if (manifestCache.value && manifestCache.dir === dir) return manifestCache.value;
  try {
    const raw = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')) as BankManifest;
    manifestCache.value = raw;
    manifestCache.dir = dir;
    return raw;
  } catch (e) {
    logEvent('bank_manifest_error', { name: e instanceof Error ? e.name : 'unknown' });
    throw new ApiError('engine_unavailable', 'The assessment engine could not read its question bank.');
  }
}

export function manifestTopic(topicId: string): BankManifestTopic | null {
  return loadManifest().topics.find((t) => t.id === topicId) ?? null;
}

interface PurposeKeys {
  answer: Buffer;
  explanation: Buffer;
  seal: Buffer;
  keyId: string;
  isDev: boolean;
}

/** Select the key material that matches the topic file's `sealed_with`. */
function keysFor(cfg: ServerConfig, sealedWith: string): PurposeKeys {
  const candidates: { keyId: string; material: string }[] = [];
  if (cfg.bankKey) candidates.push({ keyId: bankKeyId(cfg.bankKey), material: cfg.bankKey });
  for (const [keyId, material] of Object.entries(cfg.bankKeysOld)) {
    candidates.push({ keyId: String(keyId), material: String(material) });
  }
  candidates.push({ keyId: bankKeyId(DEV_BANK_KEY), material: DEV_BANK_KEY });

  const match = candidates.find((c) => c.keyId === sealedWith);
  if (!match) {
    throw new ApiError(
      'engine_unavailable',
      'The question bank was sealed with a different key. Set FREEVERSE_BANK_KEY to the matching secret (or list earlier keys in FREEVERSE_BANK_KEYS_OLD).',
    );
  }
  return {
    answer: hkdf(match.material, 'answer-commit'),
    explanation: hkdf(match.material, 'explanation-aes'),
    seal: hkdf(match.material, 'file-seal'),
    keyId: match.keyId,
    isDev: match.keyId === bankKeyId(DEV_BANK_KEY),
  };
}

export function loadTopic(cfg: ServerConfig, topicId: string): BankTopic {
  const cached = topicCache.get(topicId);
  if (cached) return cached;

  const dir = bankDir();
  const path = join(dir, `${topicId}.sealed.json`);
  if (!existsSync(path)) throw new ApiError('bad_request', `Unknown topic "${topicId}".`);

  let sealed: SealedTopic;
  try {
    sealed = JSON.parse(readFileSync(path, 'utf8')) as SealedTopic;
  } catch (e) {
    logEvent('bank_read_error', { topic: topicId, name: e instanceof Error ? e.name : 'unknown' });
    throw new ApiError('engine_unavailable', 'The question bank could not be read.');
  }

  const keys = keysFor(cfg, sealed.sealed_with);

  // Detect any edit to prompts, options or metadata.
  const { seal, ...withoutSeal } = sealed;
  const expectedSeal = `hmac-sha256:${hmacHex(keys.seal, canonical(withoutSeal), 64)}`;
  if (seal !== expectedSeal) {
    logEvent('bank_seal_mismatch', { topic: topicId, keyId: keys.keyId });
    throw new ApiError('engine_unavailable', 'The question bank failed its integrity check; assessments for this topic are disabled.');
  }

  const items: BankItem[] = [];
  const explanations = new Map<string, string>();
  const refIndex = new Map<string, BankItem>();
  const skills: { skillId: string; name: string; index: number }[] = [];

  for (const pool of sealed.sub_pools) {
    skills.push({ skillId: pool.skill_id, name: pool.name, index: pool.index });
    for (const item of pool.items) {
      const answerIndex = item.options.findIndex(
        (option, idx) => answerCommit(keys.answer, item.id, idx, option) === item.answer_commit,
      );
      if (answerIndex < 0) {
        logEvent('bank_answer_unresolved', { topic: topicId, item: item.id });
        throw new ApiError(
          'engine_unavailable',
          `Question bank integrity error on ${item.id}; assessments for this topic are disabled.`,
        );
      }
      const bankItem: BankItem = {
        id: item.id,
        prompt: item.prompt,
        options: item.options,
        answerIndex,
        ref: itemRef(keys.seal, sealed.topic.version, item.id),
        skillIndex: pool.index,
        skillId: pool.skill_id,
        skillName: pool.name,
        tier: item.difficulty?.tier ?? 2,
        reviewStatus: item.review?.status ?? 'provisional',
        lengthRatio: item.length_ratio ?? 1,
      };
      items.push(bankItem);
      refIndex.set(bankItem.ref, bankItem);
      const explanation = decryptExplanation(keys.explanation, item.explanation_enc);
      if (explanation) explanations.set(item.id, explanation);
    }
  }

  const topic: BankTopic = {
    id: sealed.topic.id,
    title: sealed.topic.title,
    version: sealed.topic.version,
    estimatedMinutes: sealed.topic.estimated_minutes,
    skills,
    items,
    refIndex,
    explanations,
    keyId: keys.keyId,
  };
  topicCache.set(topicId, topic);
  return topic;
}

/**
 * Fail closed in production when the bank is sealed with the well-known
 * development key: anyone can read that key in the repository, so grading
 * with it would be exactly as trustworthy as grading in the browser.
 */
export function assertDeployableKey(cfg: ServerConfig, topic: BankTopic): void {
  if (topic.keyId === bankKeyId(DEV_BANK_KEY) && (cfg.isProduction || cfg.requireVerifiedBank)) {
    logEvent('bank_dev_key_refused', { topic: topic.id, production: cfg.isProduction });
    throw new ApiError(
      'engine_unavailable',
      'Assessments are disabled: the question bank is sealed with the public development key. Run "FREEVERSE_BANK_KEY=<secret> npm run bank:build" and redeploy.',
    );
  }
}

// ── Deterministic option permutation ────────────────────────
// Options are shuffled per attempt so position carries no information and two
// attempts never look identical. The permutation is derived from
// (attempt nonce, item ref) so the server can rebuild it at grading time
// without storing per-item state.
function prngBytes(seedKey: Buffer, seed: string, count: number): Buffer {
  const chunks: Buffer[] = [];
  let total = 0;
  let counter = 0;
  while (total < count) {
    const chunk = Buffer.from(hmacHex(seedKey, `${seed}|${counter}`, 64), 'hex');
    chunks.push(chunk);
    total += chunk.length;
    counter += 1;
  }
  return Buffer.concat(chunks).subarray(0, count);
}

/** order[positionInShuffled] = originalOptionIndex */
export function optionPermutation(cfg: ServerConfig, nonce: string, bankItemRef: string, length: number): number[] {
  const key = hkdf(cfg.signingSecret ?? 'unsafe-missing-secret', 'option-permutation');
  const bytes = prngBytes(key, `${nonce}|${bankItemRef}`, Math.max(length * 2, 16));
  const order = Array.from({ length }, (_, i) => i);
  let cursor = 0;
  for (let i = length - 1; i > 0; i -= 1) {
    const j = bytes[cursor % bytes.length]! % (i + 1);
    cursor += 1;
    const tmp = order[i]!;
    order[i] = order[j]!;
    order[j] = tmp;
  }
  return order;
}

/** Reverse a permutation: shuffledPositionOf[originalIndex] = shuffledPosition */
function inversePermutation(order: number[]): number[] {
  const inverse = new Array<number>(order.length);
  order.forEach((originalIndex, shuffledPosition) => {
    inverse[originalIndex] = shuffledPosition;
  });
  return inverse;
}

export interface SelectedItem {
  item: BankItem;
  shuffledOptions: string[];
  /** shuffled position holding each original option index */
  shuffledPositionOf: number[];
}

export interface SelectionResult {
  blueprintId: string;
  items: SelectedItem[];
  coverageGaps: string[];
  /** share of served items where the longest option is the correct one */
  baselineLongest: number;
  tierCounts: Record<number, number>;
}

/**
 * Blueprint-driven item selection.
 *
 *   1. Coverage first — one item per sub-pool (skill) so an attempt samples the
 *      whole topic instead of a lucky corner of it.
 *   2. Tier targeting — within a skill, prefer the level's difficulty tiers,
 *      falling back to adjacent tiers when a skill has none.
 *   3. Bias-aware ordering — among equally preferred candidates, order by how
 *      strongly the correct option is the length outlier and draw from the best
 *      few at random. This measurably reduces (it cannot eliminate) the
 *      "always pick the longest option" exploit; see ASSESSMENT_QUALITY.md.
 */
export function selectItems(cfg: ServerConfig, topic: BankTopic, levelId: LevelId, nonce: string): SelectionResult {
  const level = LEVELS[levelId];
  if (!level) throw new ApiError('bad_request', `Unknown level "${levelId}".`);

  // Fail closed: a level that the published manifest does not offer must not be
  // assemblable, even if a caller reaches this function directly.
  const published = manifestTopic(topic.id)?.levels?.[levelId];
  if (published && !published.available) {
    throw new ApiError('engine_unavailable', published.reason ?? 'This assessment level is not available for this topic.');
  }

  const pool = topic.items.filter((item) =>
    level.selection.pool === 'approved' ? item.reviewStatus === 'approved' : item.reviewStatus !== 'rejected',
  );
  if (pool.length === 0) {
    throw new ApiError('engine_unavailable', 'No reviewed questions are available for this topic yet.');
  }

  const bySkill = new Map<number, BankItem[]>();
  for (const item of pool) {
    const list = bySkill.get(item.skillIndex) ?? [];
    list.push(item);
    bySkill.set(item.skillIndex, list);
  }

  const chosen: BankItem[] = [];
  const used = new Set<string>();
  const coverageGaps: string[] = [];

  const pickFromSkill = (skillIndex: number): BankItem | null => {
    const candidates = (bySkill.get(skillIndex) ?? []).filter((c) => !used.has(c.id));
    if (!candidates.length) return null;
    let bucket = candidates;
    for (const tier of level.selection.preferredTiers) {
      const subset = candidates.filter((c) => c.tier === tier);
      if (subset.length) {
        bucket = subset;
        break;
      }
    }
    const ordered = [...bucket].sort((a, b) => a.lengthRatio - b.lengthRatio || a.id.localeCompare(b.id));
    const shortlist = ordered.slice(0, Math.min(3, ordered.length));
    return shortlist[randomInt(shortlist.length)] ?? null;
  };

  for (const skill of topic.skills) {
    const picked = pickFromSkill(skill.index);
    if (!picked) {
      coverageGaps.push(skill.skillId);
      continue;
    }
    used.add(picked.id);
    chosen.push(picked);
  }

  // Fill remaining slots round-robin so the attempt still reaches its length.
  let guard = 0;
  while (chosen.length < level.selection.questionCount && guard < topic.skills.length * 4) {
    guard += 1;
    for (const skill of topic.skills) {
      if (chosen.length >= level.selection.questionCount) break;
      const picked = pickFromSkill(skill.index);
      if (!picked) continue;
      used.add(picked.id);
      chosen.push(picked);
    }
  }

  if (chosen.length < 10) {
    throw new ApiError('engine_unavailable', 'Not enough reviewed questions to assemble this assessment.');
  }

  const items: SelectedItem[] = chosen.map((item) => {
    const permutation = optionPermutation(cfg, nonce, item.ref, item.options.length);
    const shuffledOptions = permutation.map((originalIndex) => item.options[originalIndex]!);
    return { item, shuffledOptions, shuffledPositionOf: inversePermutation(permutation) };
  });

  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    const tmp = items[i]!;
    items[i] = items[j]!;
    items[j] = tmp;
  }

  let longestPicks = 0;
  const tierCounts: Record<number, number> = {};
  for (const { item, shuffledOptions } of items) {
    tierCounts[item.tier] = (tierCounts[item.tier] ?? 0) + 1;
    const correctText = item.options[item.answerIndex]!;
    const longest = shuffledOptions.reduce((best, o) => (o.length > best.length ? o : best), '');
    if (correctText.length >= longest.length) longestPicks += 1;
  }

  return {
    blueprintId: `rfv.blueprint.${topic.id}.${levelId}.v1`,
    items,
    coverageGaps,
    baselineLongest: Number((longestPicks / items.length).toFixed(4)),
    tierCounts,
  };
}

/** Which levels can be served for a topic right now. */
export function availableLevels(topicId: string): { level: LevelId; available: boolean; reason?: string }[] {
  const manifest = manifestTopic(topicId);
  if (!manifest) return LEVEL_ORDER.map((level) => ({ level, available: false, reason: 'Unknown topic.' }));
  return LEVEL_ORDER.map((level) => {
    const info = manifest.levels?.[level];
    return { level, available: Boolean(info?.available), reason: info?.reason };
  });
}
