#!/usr/bin/env node
// ────────────────────────────────────────────────────────────
// npm run bank:build
//
// Validates the question bank, seals it (answer key never stored
// in plaintext) and emits:
//   server/bank/<topic>.sealed.json   authoritative, server-only, no plaintext answers
//   server/bank/manifest.json         public metadata + level availability
//   server/bank/review-queue.json     human rewrite queue (prioritised)
//   src/data/bankCatalog.json         client-safe catalog (imported by the UI)
//
// Usage
//   FREEVERSE_BANK_KEY=<secret> npm run bank:build
//   npm run bank:build -- --master bank-master      # author from plaintext (gitignored dir)
//   npm run bank:build -- --report-only             # validate, change nothing
//
// Without FREEVERSE_BANK_KEY the bank is sealed with a WELL-KNOWN
// development key. The production server refuses to grade with a
// development-sealed bank, so this is safe but not deployable.
// ────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BANK_SCHEMA,
  DEV_BANK_KEY,
  deriveBankKeys,
  answerCommit,
  encryptExplanation,
  sealTopicFile,
  analyseTopic,
  longestPickAccuracy,
  sha256Hex,
} from './lib/bank.mjs';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Level policy is data (shared/levels.json) so plain Node and the TS app
// read identical thresholds. `skillId` mirrors shared/levels.ts:skillId;
// tests/levels-contract.test.ts asserts both implementations agree.
const levelPolicy = JSON.parse(readFileSync(join(ROOT, 'shared', 'levels.json'), 'utf8'));
delete levelPolicy._comment;
const LEVELS = levelPolicy;
const LEVEL_ORDER = ['foundation', 'intermediate', 'advanced'];
const credentialId = (topicId, level) => `rfv.cred.${topicId}.${level}`;
function skillId(topicId, index, name) {
  const slug = String(name)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return `rfv.skill.${topicId}.${String(index + 1).padStart(2, '0')}-${slug}`;
}

const PLAINTEXT_DIR = join(ROOT, 'src', 'quizzes');
const OUT_DIR = join(ROOT, 'server', 'bank');
const CATALOG_PATH = join(ROOT, 'src', 'data', 'bankCatalog.json');

const args = process.argv.slice(2);
const reportOnly = args.includes('--report-only');
const masterArg = args.find((a) => a.startsWith('--master'));
const masterDir = masterArg ? join(ROOT, masterArg.split('=')[1] ?? 'bank-master') : join(ROOT, 'bank-master');

const configuredKey = process.env.FREEVERSE_BANK_KEY;
const bankKey = configuredKey || DEV_BANK_KEY;
const keys = deriveBankKeys(bankKey);
const devKeyDerived = deriveBankKeys(DEV_BANK_KEY);

// Minimum bar for an `advanced` credential (approved-only items).
const ADVANCED_MIN_SKILL_COVERAGE = 16;

const log = (...a) => console.log(...a);

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

// ── Source resolution ───────────────────────────────────────
// Priority: explicit master dir → repo plaintext → sealed bank.
function loadSources() {
  const sources = new Map();

  if (existsSync(masterDir)) {
    for (const f of readdirSync(masterDir).filter((f) => f.endsWith('.json'))) {
      sources.set(f.replace(/\.json$/, ''), { path: join(masterDir, f), kind: 'plaintext' });
    }
  }
  if (existsSync(PLAINTEXT_DIR)) {
    for (const f of readdirSync(PLAINTEXT_DIR).filter((f) => f.endsWith('.json'))) {
      const id = f.replace(/\.json$/, '');
      if (!sources.has(id)) sources.set(id, { path: join(PLAINTEXT_DIR, f), kind: 'plaintext' });
    }
  }
  if (existsSync(OUT_DIR)) {
    for (const f of readdirSync(OUT_DIR).filter((f) => f.endsWith('.sealed.json'))) {
      const id = f.replace(/\.sealed\.json$/, '');
      if (!sources.has(id)) sources.set(id, { path: join(OUT_DIR, f), kind: 'sealed' });
    }
  }
  return sources;
}

async function loadTopic(id, source) {
  if (source.kind === 'plaintext') {
    const raw = readJson(source.path);
    return { raw, keyId: keys.keyId, sourceKind: 'plaintext' };
  }

  // Sealed source: decrypt the answer key with the configured key, or with the
  // well-known development key if (and only if) the file was dev-sealed.
  const raw = readJson(source.path);
  let useKeys = keys;
  if (raw.sealed_with !== keys.keyId) {
    if (raw.sealed_with === devKeyDerived.keyId) useKeys = devKeyDerived;
    else {
      throw new Error(
        `[bank] ${id}: bank is sealed with key id "${raw.sealed_with}" but FREEVERSE_BANK_KEY resolves to ` +
          `"${keys.keyId}". Set the matching FREEVERSE_BANK_KEY (or FREEVERSE_BANK_KEY_OLD) and re-run.`,
      );
    }
  }
  return { raw: unseal(raw, useKeys), keyId: keys.keyId, sourceKind: 'sealed' };
}

/** Round-trip: recover plaintext answers/explanations from a sealed file. */
function unseal(sealed, useKeys) {
  const subPools = sealed.sub_pools.map((pool) => ({
    topic: pool.name,
    questions: pool.items.map((item) => {
      const answer = item.options.findIndex(
        (opt, idx) => answerCommitKey(useKeys, item.id, idx, opt) === item.answer_commit,
      );
      if (answer < 0) {
        throw new Error(`[bank] ${item.id}: sealed answer commit does not match any option — file corrupt or wrong key`);
      }
      return {
        id: item.id,
        q: item.prompt,
        options: item.options,
        answer,
        explanation: decryptExplanation(useKeys, item.explanation_enc),
      };
    }),
  }));
  return {
    id: sealed.topic.id,
    title: sealed.topic.title,
    description: sealed.topic.description,
    category: sealed.topic.category,
    icon: sealed.topic.icon,
    estimatedMinutes: sealed.topic.estimated_minutes,
    passingScore: sealed.topic.passing_score,
    questionsPerAttempt: sealed.topic.questions_per_attempt,
    durationSec: sealed.topic.duration_sec,
    version: sealed.topic.version,
    subPools,
  };
}

// Local re-implementations to avoid importing server TS from a .mjs script.
import { createDecipheriv, createHmac } from 'node:crypto';
function answerCommitKey(k, questionId, optionIndex, optionText) {
  return `hmac-sha256:${createHmac('sha256', k.answer).update(`rfv.answer.v1|${questionId}|${optionIndex}|${optionText}`, 'utf8').digest('hex').slice(0, 32)}`;
}
function decryptExplanation(k, blob) {
  const [format, ivB64, ctB64] = String(blob).split(':');
  if (format !== 'aes-256-gcm.v1') throw new Error(`[bank] unknown explanation format ${format}`);
  const iv = Buffer.from(ivB64, 'base64url');
  const body = Buffer.from(ctB64, 'base64url');
  const ct = body.subarray(0, body.length - 16);
  const tag = body.subarray(body.length - 16);
  const d = createDecipheriv('aes-256-gcm', k.explanation, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]).toString('utf8');
}

// ── Main ────────────────────────────────────────────────────
mkdirSync(OUT_DIR, { recursive: true });
const sources = loadSources();
if (!sources.size) {
  console.error('[bank] no question sources found (src/quizzes, bank-master, or server/bank/*.sealed.json)');
  process.exit(1);
}

const manifestTopics = [];
const catalogTopics = [];
const blockingQueue = [];
const biasQueue = [];
const reportTopics = [];
let grandTotal = 0;

for (const [topicId, source] of [...sources.entries()].sort()) {
  const { raw, sourceKind } = await loadTopic(topicId, source);
  const analysis = analyseTopic(raw);
  grandTotal += analysis.itemCount;

  const itemsById = new Map(analysis.items.map((i) => [i.id, i]));
  const skills = raw.subPools.map((pool, i) => ({
    index: i,
    name: pool.topic,
    skillId: skillId(topicId, i, pool.topic),
    items: pool.questions.length,
    approved: analysis.items.filter((it) => it.subPool === i && it.review.status === 'approved').length,
    serviceable: analysis.items.filter((it) => it.subPool === i && it.review.status !== 'rejected').length,
  }));

  // ── Sealed output ──
  const sealed = {
    schema: BANK_SCHEMA,
    sealed_with: keys.keyId,
    topic: {
      id: raw.id,
      title: raw.title,
      description: raw.description,
      category: raw.category,
      icon: raw.icon,
      estimated_minutes: raw.estimatedMinutes,
      version: raw.version ?? '2.0.0',
    },
    sub_pools: raw.subPools.map((pool, pi) => ({
      index: pi,
      name: pool.topic,
      skill_id: skills[pi].skillId,
      items: pool.questions.map((q) => {
        const meta = itemsById.get(q.id);
        // Neutralise the legacy position bias before sealing: in the source bank
        // 1,499 of 1,500 correct options were stored at index 0. Options are
        // re-ordered deterministically here (stable across rebuilds) and the
        // answer is committed to the new index, so a future leak of bank + key
        // still cannot be reduced to "the answer is always the first option".
        // A plaintext master has the legacy index order, so it is neutralised
        // here. A bank that is being re-sealed (key rotation) already carries a
        // neutralised order — re-permuting it would churn the bank on every
        // rebuild and skew the position distribution.
        const order = sourceKind === 'sealed'
          ? Array.from({ length: q.options.length }, (_, i) => i)
          : stableOptionOrder(raw.id, q.id, q.options.length);
        const options = order.map((i) => q.options[i]);
        const answerIndex = order.indexOf(q.answer);
        return {
          id: q.id,
          prompt: q.q,
          options,
          answer_commit: answerCommit(keys, q.id, answerIndex, options[answerIndex]),
          explanation_enc: encryptExplanation(keys, q.explanation ?? ''),
          difficulty: meta?.difficulty ?? classifyFallback(q),
          review: meta?.review ?? { status: 'provisional', method: 'automated-validation-v1', human_reviewed: false },
          // Serving-policy inputs (public metadata, no answer information):
          length_ratio: meta?.lengthRatio ?? 1,
          findings: (meta?.findings ?? []).map((f) => ({ code: f.code, severity: f.severity })),
        };
      }),
    })),
  };
  sealed.seal = sealTopicFile(keys, sealed);

  // ── Level availability from the blueprint policy ──
  // The published skill-coverage number is declared here and asserted against
  // the runtime selection in tests/levels-contract.test.ts, so the UI can say
  // "this level assesses 16 of 20 skill areas" and mean it.
  const totalSkills = new Set(analysis.items.map((i) => i.subPool)).size;
  const levelAvailability = {};
  for (const levelId of LEVEL_ORDER) {
    const lvl = LEVELS[levelId];
    const pool = analysis.items.filter((i) =>
      lvl.selection.pool === 'approved' ? i.review.status === 'approved' : i.review.status !== 'rejected',
    );
    const assessedSkills = new Set(pool.map((i) => i.subPool)).size;
    const enough = pool.length >= lvl.selection.questionCount;
    const minCoverage = lvl.id === 'advanced' ? ADVANCED_MIN_SKILL_COVERAGE : totalSkills;
    const covered = assessedSkills >= minCoverage;
    const reasons = [];
    if (!enough) reasons.push(`only ${pool.length} reviewed item(s) available, ${lvl.selection.questionCount} required`);
    if (!covered) reasons.push(`only ${assessedSkills}/${minCoverage} required skill areas have a reviewed item`);
    levelAvailability[levelId] = {
      available: enough && covered,
      reason: reasons.length
        ? `${reasons.join('; ')}. Item review is in progress — see ASSESSMENT_QUALITY.md.`
        : undefined,
      blueprintId: `rfv.blueprint.${topicId}.${levelId}.v1`,
      skillCoverage: { assessed: assessedSkills, total: totalSkills, minRequired: minCoverage },
    };
  }

  const longestBaseline = longestPickAccuracy(analysis.items);
  // `verified` requires ≥10 percentage points of headroom between what a
  // zero-knowledge strategy scores and what the credential demands.
  const integrityStatus =
    analysis.stats.servableBaseline <= LEVELS.foundation.passingScore / 100 - 0.1 ? 'verified' : 'under-review';

  // ── Review queue (human work list) ──
  // Two tiers so the file stays reviewable:
  //   blocking[] = HIGH severity: the item may be wrong; withheld from service.
  //   bias[]     = MEDIUM severity: answerable but exploitable/ambiguous; in service,
  //                excluded from Advanced blueprints, queued for rewrite.
  for (const item of analysis.items) {
    const high = item.findings.filter((f) => f.severity === 'high');
    const medium = item.findings.filter((f) => f.severity === 'medium');
    if (high.length) {
      blockingQueue.push({
        topicId,
        questionId: item.id,
        skill: item.subPoolName,
        findings: item.findings.map((f) => ({ code: f.code, severity: f.severity, note: f.note })),
        prompt: item.q.q,
        options: item.q.options,
        flaggedAnswer: item.q.options[item.q.answer],
        suggestedAction: suggestAction(item),
        status: 'pending-human-review',
        note: 'Suggestion is a DRAFT. Not applied automatically: an automated rewrite can change which option is correct.',
      });
    } else if (medium.length) {
      const codeCounts = medium.reduce((acc, f) => { acc[f.code] = (acc[f.code] ?? 0) + 1; return acc; }, {});
      biasQueue.push({
        topicId,
        questionId: item.id,
        skill: item.subPoolName,
        lengthRatio: item.lengthRatio,
        isLongest: item.isLongest,
        tier: item.difficulty.tier,
        status: 'pending-bias-rewrite',
        codes: codeCounts,
      });
    }
  }

  manifestTopics.push({
    id: raw.id,
    title: raw.title,
    description: raw.description,
    category: raw.category,
    icon: raw.icon,
    estimatedMinutes: raw.estimatedMinutes,
    skillId: `rfv.skill.${raw.id}`,
    credentialId: Object.fromEntries(LEVEL_ORDER.map((l) => [l, credentialId(raw.id, l)])),
    questionCount: analysis.itemCount,
    tierCounts: analysis.stats.tierCounts,
    skills,
    levels: levelAvailability,
    quality: {
      approved: analysis.stats.approved,
      provisional: analysis.stats.provisional,
      rejected: analysis.stats.rejected,
      longestOptionBaseline: analysis.stats.longestOptionBaseline,
      servableBaseline: analysis.stats.servableBaseline,
      approvedBaseline: analysis.stats.approvedBaseline,
      lengthHeuristicRisk: analysis.stats.servableBaseline >= LEVELS.foundation.passingScore / 100,
      assessmentIntegrity: integrityStatus,
      findingsByCode: analysis.stats.findingsByCode,
    },
  });

  catalogTopics.push({
    id: raw.id,
    title: raw.title,
    description: raw.description,
    category: raw.category,
    icon: raw.icon,
    skillId: `rfv.skill.${raw.id}`,
    estimatedMinutes: raw.estimatedMinutes,
    questionCount: analysis.itemCount,
    levels: LEVEL_ORDER.map((levelId) => {
      const lvl = LEVELS[levelId];
      const a = levelAvailability[levelId];
      return {
        id: levelId,
        label: lvl.label,
        short: lvl.short,
        tagline: lvl.tagline,
        available: a.available,
        unavailableReason: a.reason,
        questionCount: lvl.selection.questionCount,
        passingScore: lvl.passingScore,
        durationSec: lvl.durationSec,
        requiresLevel: lvl.requiresLevel,
        demonstrates: lvl.demonstrates,
        skillCoverage: a.skillCoverage,
      };
    }),
    skills: skills.map((s) => ({ skillId: s.skillId, name: s.name, items: s.items })),
    quality: {
      approved: analysis.stats.approved,
      provisional: analysis.stats.provisional,
      rejected: analysis.stats.rejected,
      longestOptionBaseline: analysis.stats.longestOptionBaseline,
      servableBaseline: analysis.stats.servableBaseline,
      approvedBaseline: analysis.stats.approvedBaseline,
      lengthHeuristicRisk: analysis.stats.servableBaseline >= LEVELS.foundation.passingScore / 100,
      assessmentIntegrity: integrityStatus,
    },
  });

  reportTopics.push({ topicId, stats: analysis.stats, longestBaseline });
  void itemsById;

  if (!reportOnly) {
    writeFileSync(join(OUT_DIR, `${raw.id}.sealed.json`), `${JSON.stringify(sealed, null, 2)}\n`);
  }
  log(
    `  ${raw.id.padEnd(24)} items=${String(analysis.itemCount).padStart(3)} ` +
      `approved=${String(analysis.stats.approved).padStart(3)} provisional=${String(analysis.stats.provisional).padStart(3)} ` +
      `withheld=${String(analysis.stats.rejected).padStart(2)} ` +
      `longest-pick=${(longestBaseline * 100).toFixed(0).padStart(3)}% ` +
      `levels=${LEVEL_ORDER.filter((l) => levelAvailability[l].available).map((l) => l[0].toUpperCase()).join('') || '—'}`,
  );
}

// ── Aggregate output ──
const manifest = {
  schema: 'rfv.bank-manifest/2',
  bankVersion: '2.0.0',
  generatedAt: new Date().toISOString(),
  keyId: keys.keyId,
  devSealed: !configuredKey,
  sourceHash: sha256Hex(JSON.stringify(manifestTopics.map((t) => [t.id, t.questionCount, t.quality]))),
  topics: manifestTopics,
  totals: {
    topics: manifestTopics.length,
    questions: grandTotal,
    approved: manifestTopics.reduce((a, t) => a + t.quality.approved, 0),
    provisional: manifestTopics.reduce((a, t) => a + t.quality.provisional, 0),
    rejected: manifestTopics.reduce((a, t) => a + t.quality.rejected, 0),
  },
};

if (!reportOnly) {
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(join(OUT_DIR, 'quality-report.json'), `${JSON.stringify({ generatedAt: manifest.generatedAt, keyId: keys.keyId, topics: reportTopics, totals: manifest.totals }, null, 2)}\n`);
  // Compact bias queue (the real rewrite backlog) + a detailed sample to start from.
  const biasByTopic = [...new Set(biasQueue.map((b) => b.topicId))].map((id) => ({
    topicId: id,
    items: biasQueue.filter((b) => b.topicId === id).length,
    correctOptionIsLongest: biasQueue.filter((b) => b.topicId === id && b.isLongest).length,
  }));
  writeFileSync(
    join(OUT_DIR, 'review-queue.json'),
    `${JSON.stringify(
      {
        generatedAt: manifest.generatedAt,
        blocking: { count: blockingQueue.length, items: blockingQueue },
        bias: {
          count: biasQueue.length,
          byTopic: biasByTopic,
          note:
            'Bias backlog: items whose correct option is the longest and substantially longer than the distractors, ' +
            'so a "pick the longest option" strategy answers them correctly. Not applied automatically — rewriting ' +
            'options changes meaning, so a human must confirm the answer key still holds. Fixing this is the single ' +
            'highest-value assessment-quality action available (see ASSESSMENT_QUALITY.md).',
          items: biasQueue,
        },
      },
      null,
      2,
    )}\n`,
  );
  mkdirSync(dirname(CATALOG_PATH), { recursive: true });
  writeFileSync(
    CATALOG_PATH,
    `${JSON.stringify({ schema: 'rfv.catalog/2', bankVersion: manifest.bankVersion, generatedAt: manifest.generatedAt, topics: catalogTopics }, null, 2)}\n`,
  );
}

log('');
log(`bank key id        : ${keys.keyId}${configuredKey ? '' : '  (WELL-KNOWN DEV KEY — not deployable)'}`);
log(`topics             : ${manifest.totals.topics}`);
log(`questions          : ${manifest.totals.questions}`);
log(`approved           : ${manifest.totals.approved} (${((manifest.totals.approved / grandTotal) * 100).toFixed(1)}%)`);
log(`provisional        : ${manifest.totals.provisional}`);
log(`withheld (rejected): ${manifest.totals.rejected}`);
log(`rewrite queue      : ${blockingQueue.length} blocking (withheld) + ${biasQueue.length} bias items`);
log(`length-heuristic risk topics: ${manifestTopics.filter((t) => t.quality.lengthHeuristicRisk).length}/${manifestTopics.length}`);
log(`advanced available : ${manifestTopics.filter((t) => t.levels.advanced.available).map((t) => t.id).join(', ') || 'none'}`);
if (!reportOnly) log(`\nwrote server/bank/*.sealed.json, manifest.json, quality-report.json, review-queue.json, src/data/bankCatalog.json`);

// ── Cleanup: plaintext sources must never stay in the working tree ──
if (!reportOnly && !configuredKey && existsSync(PLAINTEXT_DIR) && !masterArg) {
  log('');
  log('NOTE: src/quizzes/*.json (plaintext answer keys) still exist in the working tree.');
  log('      They are redundant once sealed and must be removed before committing:');
  log('      git rm -r src/quizzes');
}

/** Deterministic option order derived from sha256(topic|id) — stable across rebuilds. */
function stableOptionOrder(topicId, questionId, length) {
  const order = Array.from({ length }, (_, i) => i);
  let bytes = Buffer.from(sha256Hex(`rfv.option-order.v1|${topicId}|${questionId}`), 'hex');
  let cursor = 0;
  for (let i = length - 1; i > 0; i -= 1) {
    const j = bytes[cursor % bytes.length] % (i + 1);
    cursor += 1;
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

function classifyFallback() {
  return { tier: 2, signals: ['unclassified'], method: 'fallback' };
}

function suggestAction(item) {
  const answer = item.q.options[item.q.answer];
  const m = String(answer).match(/^(.*?)\s*[—–-]\s+(.*)$/) || String(answer).match(/^(.*?)\s*\(((?:[^()]+))\)\s*$/);
  if (m) {
    return `Candidate: keep the leading phrase "${m[1].trim().slice(0, 90)}" and move "${m[2].trim().slice(0, 60)}" into the explanation (draft — verify the shortened option is still unambiguously correct and not a near-duplicate of a distractor).`;
  }
  return 'Rewrite the two shortest distractors so all four options have comparable specificity and length (do not pad with filler — add plausible, wrong, specific detail).';
}

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
void rmSync;
void basename;
