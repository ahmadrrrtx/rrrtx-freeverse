// ────────────────────────────────────────────────────────────
// RRRTX FreeVerse — bank sealing + quality analysis library
//
// Used by `npm run bank:build` (scripts/build-bank.mjs).
// The server re-implements the *verification* half of this in
// TypeScript (server/core/bank.ts) and a regression test asserts
// both halves agree byte-for-byte.
//
// THREAT MODEL
//   The repository is public. Question prompts and options are
//   therefore public (they are also sent to the browser during an
//   attempt — that is unavoidable). What must NOT be public is
//   the answer key. We store:
//     answer_commit = HMAC-SHA256(kAnswer, "rfv.answer.v1|qid|index|option")
//     explanation_enc = AES-256-GCM(kExpl, explanation)
//   kAnswer/kExpl are derived (HKDF-SHA256) from a server-only env
//   secret. Without that secret the correct option cannot be
//   recovered from the repository, and it cannot be brute-forced
//   (4 candidate options) because HMAC needs the key.
// ────────────────────────────────────────────────────────────

import { createHmac, hkdfSync, randomBytes, createCipheriv, createHash } from 'node:crypto';

export const BANK_SCHEMA = 'rfv.bank/2';
export const ANSWER_COMMIT_DOMAIN = 'rfv.answer.v1';
export const EXPLANATION_FORMAT = 'aes-256-gcm.v1';

/** Well-known development key. Production refuses to grade with this. */
export const DEV_BANK_KEY = 'rfv-dev-bank-key-not-for-production';

function hkdf(keyMaterial, info, length = 32) {
  return Buffer.from(
    hkdfSync('sha256', Buffer.from(keyMaterial, 'utf8'), Buffer.from('rfv-bank-v1', 'utf8'), Buffer.from(info, 'utf8'), length),
  );
}

/** Derive all purpose-bound keys from one env secret. */
export function deriveBankKeys(keyMaterial) {
  return {
    answer: hkdf(keyMaterial, 'answer-commit'),
    explanation: hkdf(keyMaterial, 'explanation-aes'),
    seal: hkdf(keyMaterial, 'file-seal'),
    keyId: createHash('sha256').update(keyMaterial, 'utf8').digest('hex').slice(0, 8),
  };
}

/** Stable JSON stringify: object keys sorted, no insignificant whitespace. */
export function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
}

export function sha256Hex(input) {
  return createHash('sha256').update(input).digest('hex');
}

export function answerCommit(keys, questionId, optionIndex, optionText) {
  const msg = `${ANSWER_COMMIT_DOMAIN}|${questionId}|${optionIndex}|${optionText}`;
  return `hmac-sha256:${createHmac('sha256', keys.answer).update(msg, 'utf8').digest('hex').slice(0, 32)}`;
}

export function encryptExplanation(keys, plaintext) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keys.explanation, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${EXPLANATION_FORMAT}:${iv.toString('base64url')}:${Buffer.concat([ct, tag]).toString('base64url')}`;
}

export function sealTopicFile(keys, fileWithoutSeal) {
  return `hmac-sha256:${createHmac('sha256', keys.seal).update(canonical(fileWithoutSeal), 'utf8').digest('hex')}`;
}

/** HMAC of an email for pseudonymous learner references (never reversible without the key). */
export function learnerRef(keyMaterial, email) {
  const key = hkdf(keyMaterial, 'learner-ref');
  const normalized = String(email).trim().toLowerCase();
  return `hmac-sha256:${createHmac('sha256', key).update(`rfv.learner.v1|${normalized}`, 'utf8').digest('hex').slice(0, 32)}`;
}

// ────────────────────────────────────────────────────────────
// Quality analysis
//
// Every check below is deterministic and evidence-linked so the
// resulting report can be reproduced and audited. Checks marked
// `human-required` produce a queue for a person; they are never
// applied automatically (an automated rewrite can silently change
// which option is correct — see ASSESSMENT_QUALITY.md §Remediation).
// ────────────────────────────────────────────────────────────

export const FINDING_CODES = {
  LENGTH_ASYMMETRY: 'correct_option_length_outlier',
  ALL_NONE_ABOVE: 'all_or_none_of_the_above',
  NEGATIVE_STEM: 'negative_phrasing_stem',
  DUPLICATE_OPTIONS: 'duplicate_options',
  TRIVIAL_OPTION: 'trivially_short_option',
  WEAK_EXPLANATION: 'weak_or_missing_explanation',
  GIVEAWAY_SUBSTRING: 'distractor_contained_in_answer',
  DUPLICATE_STEM: 'duplicate_stem',
  NEAR_DUPLICATE_STEM: 'near_duplicate_stem',
  MISSING_ID: 'missing_or_duplicate_id',
  SHUFFLE_UNSAFE: 'answer_references_position',
  EXPLANATION_REVEALS: 'explanation_mentions_letter',
};

export const SEVERITY = { HIGH: 'high', MEDIUM: 'medium', LOW: 'low' };

// Severity semantics (deliberate, auditable):
//   HIGH   = the item may be WRONG or unanswerable → withheld from service.
//   MEDIUM = answerable but carries a bias/ambiguity defect → served, queued
//            for rewrite, excluded from Advanced blueprints.
//   LOW    = presentational / learning-value issue → served, recorded.
// Marking every biased item HIGH would withhold 1,169 of 1,500 items and take
// every assessment offline, which is a worse outcome than measured disclosure.
const FLAG_SEVERITY = {
  [FINDING_CODES.DUPLICATE_STEM]: SEVERITY.HIGH,
  [FINDING_CODES.DUPLICATE_OPTIONS]: SEVERITY.HIGH,
  [FINDING_CODES.SHUFFLE_UNSAFE]: SEVERITY.HIGH,
  [FINDING_CODES.MISSING_ID]: SEVERITY.HIGH,
  [FINDING_CODES.LENGTH_ASYMMETRY]: SEVERITY.MEDIUM,
  [FINDING_CODES.NEAR_DUPLICATE_STEM]: SEVERITY.MEDIUM,
  [FINDING_CODES.GIVEAWAY_SUBSTRING]: SEVERITY.MEDIUM,
  [FINDING_CODES.ALL_NONE_ABOVE]: SEVERITY.MEDIUM,
  [FINDING_CODES.NEGATIVE_STEM]: SEVERITY.MEDIUM,
  [FINDING_CODES.TRIVIAL_OPTION]: SEVERITY.MEDIUM,
  [FINDING_CODES.WEAK_EXPLANATION]: SEVERITY.LOW,
  [FINDING_CODES.EXPLANATION_REVEALS]: SEVERITY.LOW,
};

/**
 * Exploitability score for the "always pick the longest option" strategy.
 * 1.0 = the correct option is the longest; 0.0 = a distractor is strictly longer.
 * Used to (a) report the strategy baseline per topic and (b) order candidates so
 * the serving policy prefers the least exploitable items available.
 */
export function lengthExploitability(options, answer) {
  const correctLen = String(options[answer] ?? '').length;
  const maxOther = Math.max(...options.filter((_, i) => i !== answer).map((o) => String(o).length));
  if (correctLen === maxOther) return 1;
  return correctLen > maxOther ? 1 : 0;
}


export function normalizeText(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenSet(s) {
  return new Set(normalizeText(s).split(' ').filter((t) => t.length > 2));
}

export function jaccard(a, b) {
  const A = tokenSet(a);
  const B = tokenSet(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter += 1;
  return inter / (A.size + B.size - inter);
}

/**
 * Difficulty classification. AUTOMATED HEURISTIC — not human review.
 * Signals are deliberately simple and inspectable; the report lists
 * the signals that fired for every item so a reviewer can overrule.
 */
export function classifyDifficulty(q) {
  const stem = String(q.q);
  const options = q.options;
  const signals = [];
  let score = 0;

  const scenario = /\b(a user|your team|you are|you need|a customer|a colleague|a learner|on your team|your manager|reports that|reported that)\b/i;
  const reasoning = /\b(most likely|best|first step|why|trade-?off|safer|more appropriate|which approach|primary cause|root cause)\b/i;
  const debugging = /\b(debug|bug|error|fails?|broken|not working|throws|exception|crash)\b/i;
  const multi = /\b(multi-?step|sequence|first.*then|before.*after)\b/i;
  const codeish = /(`|\(\)|=>|\{\{|<\/|\bSELECT\b|\bFROM\b|\bWHERE\b|\bdef \b|\bconst \b|\bfunction\b|\bclass=|\bgit \b|\bnpm \b)/;
  const defineish = /\b(what (is|are|does)|define|stands? for|which of these (is|are) (a|an)\b|what term)\b/i;

  if (scenario.test(stem)) { score += 2; signals.push('scenario_framing'); }
  if (debugging.test(stem)) { score += 1; signals.push('debugging_framing'); }
  if (reasoning.test(stem)) { score += 1; signals.push('judgement_required'); }
  if (multi.test(stem)) { score += 2; signals.push('multi_step_wording'); }
  if (codeish.test(stem) || options.some((o) => codeish.test(String(o)))) { score += 1; signals.push('code_snippet'); }
  if (defineish.test(stem)) { score -= 1; signals.push('definitional_stem'); }
  if (stem.length >= 90) { score += 1; signals.push('long_stem'); }
  if (stem.length <= 45) { score -= 1; signals.push('short_stem'); }
  const multiClause = options.filter((o) => /[,;]/.test(String(o)) && String(o).length > 60).length;
  if (multiClause >= 2) { score += 1; signals.push('multi_clause_options'); }

  const tier = score <= 0 ? 1 : score <= 2 ? 2 : 3;
  return { tier, signals, method: 'automated-heuristic-v1', raw_score: score };
}

/** Per-item automated analysis. */
export function analyseItem(topicId, q, index) {
  const findings = [];
  const options = q.options ?? [];
  const answer = q.answer;
  const correct = options[answer] ?? '';

  if (!q.id) findings.push({ code: FINDING_CODES.MISSING_ID, severity: FLAG_SEVERITY[FINDING_CODES.MISSING_ID], note: 'item has no id' });
  if (options.length !== 4) {
    findings.push({ code: FINDING_CODES.DUPLICATE_OPTIONS, severity: FLAG_SEVERITY[FINDING_CODES.DUPLICATE_OPTIONS], note: `expected 4 options, found ${options.length}` });
  }
  if (typeof answer !== 'number' || answer < 0 || answer >= options.length) {
    findings.push({ code: FINDING_CODES.MISSING_ID, severity: FLAG_SEVERITY[FINDING_CODES.MISSING_ID], note: `answer index out of range: ${answer}` });
  }

  const seen = new Map();
  options.forEach((o, i) => {
    const key = normalizeText(o);
    if (seen.has(key)) {
      findings.push({ code: FINDING_CODES.DUPLICATE_OPTIONS, severity: FLAG_SEVERITY[FINDING_CODES.DUPLICATE_OPTIONS], note: `options ${seen.get(key)} and ${i} are identical` });
    } else {
      seen.set(key, i);
    }
  });

  if (/\b(all|none) of the above\b/i.test(options.join(' '))) {
    findings.push({ code: FINDING_CODES.ALL_NONE_ABOVE, severity: FLAG_SEVERITY[FINDING_CODES.ALL_NONE_ABOVE], note: 'uses all/none of the above' });
  }
  if (/\b(not|except)\b/i.test(q.q)) {
    findings.push({ code: FINDING_CODES.NEGATIVE_STEM, severity: FLAG_SEVERITY[FINDING_CODES.NEGATIVE_STEM], note: 'negative phrasing in stem' });
  }
  const shortOpts = options.filter((o) => String(o).trim().length < 8).length;
  if (shortOpts > 0) {
    findings.push({ code: FINDING_CODES.TRIVIAL_OPTION, severity: FLAG_SEVERITY[FINDING_CODES.TRIVIAL_OPTION], note: `${shortOpts} option(s) shorter than 8 chars` });
  }

  const others = options.filter((_, i) => i !== answer).map((o) => String(o).length);
  const avgOther = others.length ? others.reduce((a, b) => a + b, 0) / others.length : 0;
  if (avgOther > 0 && correct.length > 1.8 * avgOther && correct.length >= 70) {
    findings.push({
      code: FINDING_CODES.LENGTH_ASYMMETRY,
      severity: FLAG_SEVERITY[FINDING_CODES.LENGTH_ASYMMETRY],
      note: `answer is ${(correct.length / avgOther).toFixed(2)}x the mean distractor length (${correct.length} vs ${Math.round(avgOther)} chars) — 'pick the longest' heuristic`,
    });
  }

  for (const o of options) {
    if (o === correct) continue;
    const t = String(o).trim().toLowerCase();
    if (t.length >= 12 && correct.toLowerCase().includes(t)) {
      findings.push({ code: FINDING_CODES.GIVEAWAY_SUBSTRING, severity: FLAG_SEVERITY[FINDING_CODES.GIVEAWAY_SUBSTRING], note: 'a distractor is a substring of the correct option' });
      break;
    }
  }

  const expl = q.explanation ?? '';
  if (expl.trim().length < 40) {
    findings.push({ code: FINDING_CODES.WEAK_EXPLANATION, severity: FLAG_SEVERITY[FINDING_CODES.WEAK_EXPLANATION], note: `explanation is ${expl.trim().length} chars` });
  }
  if (/\b(option|answer)\s*[A-D]\b/i.test(expl)) {
    findings.push({ code: FINDING_CODES.EXPLANATION_REVEALS, severity: FLAG_SEVERITY[FINDING_CODES.EXPLANATION_REVEALS], note: 'explanation references an option letter (breaks option shuffling)' });
  }
  if (/\b(option|answer)\s+[1-4]\b/i.test(q.q)) {
    findings.push({ code: FINDING_CODES.SHUFFLE_UNSAFE, severity: FLAG_SEVERITY[FINDING_CODES.SHUFFLE_UNSAFE], note: 'stem references an option position (breaks option shuffling)' });
  }

  const hasHigh = findings.some((f) => f.severity === SEVERITY.HIGH);
  const hasMedium = findings.some((f) => f.severity === SEVERITY.MEDIUM);
  const reviewStatus = hasHigh ? 'rejected' : hasMedium || findings.length ? 'provisional' : 'approved';

  const correctLen = correct.length;
  const maxOtherLen = Math.max(0, ...options.filter((_, i) => i !== answer).map((o) => String(o).length));

  return {
    id: q.id,
    index,
    findings,
    lengthRatio: maxOtherLen === 0 ? 1 : Number((correctLen / maxOtherLen).toFixed(3)),
    isLongest: correctLen >= maxOtherLen,
    difficulty: classifyDifficulty(q),
    review: {
      status: reviewStatus,
      method: 'automated-validation-v1',
      human_reviewed: false,
      last_reviewed: new Date().toISOString().slice(0, 10),
    },
  };
}

/**
 * Topic-level checks that need cross-item context:
 * duplicate/near-duplicate stems, answer position distribution, and the
 * "always pick the longest option" exploit rate.
 */
export function analyseTopic(topic) {
  const items = [];
  topic.subPools.forEach((pool, pi) => {
    (pool.questions ?? []).forEach((q, qi) => {
      items.push({
        ...analyseItem(topic.id, q, qi),
        subPool: pi,
        subPoolName: pool.topic,
        q,
      });
    });
  });

  const byStem = new Map();
  for (const item of items) {
    const key = normalizeText(item.q.q);
    if (!byStem.has(key)) byStem.set(key, []);
    byStem.get(key).push(item.id);
  }
  for (const item of items) {
    const key = normalizeText(item.q.q);
    const group = byStem.get(key) ?? [];
    if (group.length > 1) {
      item.findings.push({
        code: FINDING_CODES.DUPLICATE_STEM,
        severity: FLAG_SEVERITY[FINDING_CODES.DUPLICATE_STEM],
        note: `identical stem to ${group.filter((x) => x !== item.id).join(', ')}`,
      });
    }
  }

  // Near-duplicate stems (cross-item, same topic only — cheap O(n^2) is fine at n=100).
  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      if (items[i].q.q === items[j].q.q) continue;
      const sim = jaccard(items[i].q.q, items[j].q.q);
      if (sim >= 0.86) {
        items[i].findings.push({ code: FINDING_CODES.NEAR_DUPLICATE_STEM, severity: FLAG_SEVERITY[FINDING_CODES.NEAR_DUPLICATE_STEM], note: `${(sim * 100).toFixed(0)}% token overlap with ${items[j].id}` });
      }
    }
  }

  // Finalise statuses after cross-item findings.
  for (const item of items) {
    const hasHigh = item.findings.some((f) => f.severity === SEVERITY.HIGH);
    const rest = item.findings.length > 0;
    item.review.status = hasHigh ? 'rejected' : rest ? 'provisional' : 'approved';
  }

  const positionDistribution = [0, 0, 0, 0];
  let longestCorrect = 0;
  const tierCounts = { 1: 0, 2: 0, 3: 0 };
  for (const item of items) {
    positionDistribution[item.q.answer] = (positionDistribution[item.q.answer] ?? 0) + 1;
    tierCounts[item.difficulty.tier] += 1;
    if (item.isLongest) longestCorrect += 1;
  }

  const servable = items.filter((i) => i.review.status !== 'rejected');
  const approved = items.filter((i) => i.review.status === 'approved');
  const baseline = (list) => (list.length ? Number((list.filter((i) => i.isLongest).length / list.length).toFixed(4)) : 0);

  return {
    topicId: topic.id,
    title: topic.title,
    itemCount: items.length,
    items,
    stats: {
      positionDistribution,
      tierCounts,
      longestOptionIsCorrect: longestCorrect,
      /** Heuristic baseline over every item in the bank (the worst case if nothing is filtered). */
      longestOptionBaseline: baseline(items),
      /** Heuristic baseline over items eligible for Foundation/Intermediate. */
      servableBaseline: baseline(servable),
      /** Heuristic baseline over strictly approved items (Advanced pool). */
      approvedBaseline: baseline(approved),
      approved: approved.length,
      provisional: items.filter((i) => i.review.status === 'provisional').length,
      rejected: items.filter((i) => i.review.status === 'rejected').length,
      findingsByCode: items.flatMap((i) => i.findings).reduce((acc, f) => {
        acc[f.code] = (acc[f.code] ?? 0) + 1;
        return acc;
      }, {}),
    },
  };
}

/**
 * Simulate the "always pick the longest option" strategy over a topic.
 * Returns the fraction of items a zero-knowledge strategy would answer
 * correctly — the single most useful number in the quality report.
 */
export function longestPickAccuracy(items) {
  if (!items.length) return 0;
  let hits = 0;
  for (const item of items) {
    const opts = item.q.options;
    let best = 0;
    for (let i = 1; i < opts.length; i += 1) {
      if (String(opts[i]).length > String(opts[best]).length) best = i;
    }
    if (best === item.q.answer) hits += 1;
  }
  return Number((hits / items.length).toFixed(4));
}
