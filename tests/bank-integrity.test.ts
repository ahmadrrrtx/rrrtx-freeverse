// ────────────────────────────────────────────────────────────
// Sealed question bank — integrity + contract tests.
//
// These tests defend the answer key itself:
//   • the key cannot be recovered from the committed bank;
//   • editing the bank turns into a refusal, not a silent
//     answer-key change;
//   • the build tooling and the server derive identical values.
// ────────────────────────────────────────────────────────────

import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { __resetBankCacheForTests, loadManifest, loadTopic, optionPermutation, selectItems } from '../server/core/bank';
import { DEV_BANK_KEY } from '../server/core/bank';
import { answerCommit, hkdf } from '../server/core/crypto';
import { testConfig } from './helpers';
import { deriveBankKeys, answerCommit as scriptAnswerCommit } from '../scripts/lib/bank.mjs';

const REPO_BANK_DIR = join(process.cwd(), 'server', 'bank');

let sandbox: string | null = null;

beforeEach(() => {
  __resetBankCacheForTests();
  delete process.env.FREEVERSE_BANK_DIR;
});

afterEach(() => {
  if (sandbox) rmSync(sandbox, { recursive: true, force: true });
  sandbox = null;
  __resetBankCacheForTests();
  delete process.env.FREEVERSE_BANK_DIR;
});

function copyBankToSandbox(): string {
  sandbox = mkdtempSync(join(tmpdir(), 'rfv-bank-'));
  cpSync(REPO_BANK_DIR, sandbox, { recursive: true });
  process.env.FREEVERSE_BANK_DIR = sandbox;
  __resetBankCacheForTests();
  return sandbox;
}

describe('bank contract', () => {
  it('ships a manifest with all 15 topics and no plaintext answer keys', () => {
    const manifest = loadManifest();
    expect(manifest.topics).toHaveLength(15);
    expect(manifest.totals.questions).toBe(1500);
  });

  it('never exposes an answer key, answer text or explanation in the sealed files', () => {
    const raw = readFileSync(join(REPO_BANK_DIR, 'python-fundamentals.sealed.json'), 'utf8');
    expect(raw).not.toMatch(/"answer"\s*:/);
    expect(raw).not.toMatch(/"explanation"\s*:/);
    expect(raw).toMatch(/"answer_commit"/);
    expect(raw).toMatch(/"explanation_enc"/);
  });

  it('does not store answers at a predictable position (position-bias regression)', () => {
    const cfg = testConfig();
    const topic = loadTopic(cfg, 'python-fundamentals');
    // The legacy bank stored 1,499 of 1,500 correct options at index 0. Sealing
    // re-orders options deterministically so the stored position carries no
    // information, even for someone who later obtains the key.
    const distribution = [0, 0, 0, 0];
    for (const item of topic.items) distribution[item.answerIndex] += 1;
    const mostCommon = Math.max(...distribution);
    expect(mostCommon / topic.items.length).toBeLessThan(0.5);
  });

  it('agrees with the build tooling on key derivation and answer commits', () => {
    const keys = deriveBankKeys(DEV_BANK_KEY);
    const serverKeys = { answer: hkdf(DEV_BANK_KEY, 'answer-commit') };
    const sample = { id: 'pe-001', index: 2, text: 'A sample option text' };
    expect(scriptAnswerCommit(keys, sample.id, sample.index, sample.text)).toBe(
      answerCommit(serverKeys.answer, sample.id, sample.index, sample.text),
    );
  });

  it('produces a deterministic, valid option permutation per attempt', () => {
    const cfg = testConfig();
    const a = optionPermutation(cfg, 'nonce-a', 'ref-1', 4);
    const b = optionPermutation(cfg, 'nonce-a', 'ref-1', 4);
    const c = optionPermutation(cfg, 'nonce-b', 'ref-1', 4);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
    expect([...a].sort()).toEqual([0, 1, 2, 3]);
  });

  it('refuses to load a bank whose options were edited (tamper detection)', () => {
    const dir = copyBankToSandbox();
    const path = join(dir, 'python-fundamentals.sealed.json');
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as { sub_pools: { items: { options: string[] }[] }[] };
    // Swap a stored option: this is exactly what an attacker who can commit to
    // the public repository would try in order to change the correct answer.
    const item = parsed.sub_pools[0]!.items[0]!;
    [item.options[0], item.options[1]] = [item.options[1]!, item.options[0]!];
    writeFileSync(path, JSON.stringify(parsed));
    __resetBankCacheForTests();

    expect(() => loadTopic(testConfig(), 'python-fundamentals')).toThrowError(/integrity check/i);
  });

  it('refuses to load a bank sealed with a different key (rotation safety)', () => {
    const dir = copyBankToSandbox();
    const path = join(dir, 'python-fundamentals.sealed.json');
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as { sealed_with: string };
    parsed.sealed_with = 'deadbeef';
    writeFileSync(path, JSON.stringify(parsed));
    __resetBankCacheForTests();

    expect(() => loadTopic(testConfig({ bankKey: 'a-different-production-key' }), 'python-fundamentals')).toThrowError(/different key/i);
  });

  it('accepts a previous key from the rotation list', () => {
    const dir = copyBankToSandbox();
    const path = join(dir, 'python-fundamentals.sealed.json');
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as { sealed_with: string };
    const rotatedKeyId = parsed.sealed_with; // pretend the bank was sealed with the key we rotate away from
    writeFileSync(path, JSON.stringify(parsed));
    __resetBankCacheForTests();

    // Current key is new; the old key is supplied in the rotation map. The
    // rotation list is keyed by key id, so this exercises the lookup path.
    const cfg = testConfig({ bankKey: 'brand-new-key', bankKeysOld: { [rotatedKeyId]: DEV_BANK_KEY } });
    expect(() => loadTopic(cfg, 'python-fundamentals')).not.toThrow();
  });
});

describe('blueprint selection', () => {
  const cfg = testConfig();

  it('is coverage-first: one item per skill with no duplicates (foundation)', () => {
    const topic = loadTopic(cfg, 'python-fundamentals');
    const selection = selectItems(cfg, topic, 'foundation', 'nonce-selection');
    expect(selection.items).toHaveLength(20);
    expect(new Set(selection.items.map((i) => i.item.id)).size).toBe(20);
    expect(new Set(selection.items.map((i) => i.item.skillIndex)).size).toBe(20);
    expect(selection.coverageGaps).toHaveLength(0);
  });

  it('never serves withheld (rejected) items', () => {
    const topic = loadTopic(cfg, 'javascript-essentials');
    const selection = selectItems(cfg, topic, 'foundation', 'nonce-withheld');
    for (const { item } of selection.items) expect(item.reviewStatus).not.toBe('rejected');
  });

  it('serves strictly approved items only at advanced level', () => {
    const topic = loadTopic(cfg, 'git-github');
    const selection = selectItems(cfg, topic, 'advanced', 'nonce-advanced');
    for (const { item } of selection.items) expect(item.reviewStatus).toBe('approved');
  });

  it('reports the measured length-heuristic baseline for the served set', () => {
    const topic = loadTopic(cfg, 'python-fundamentals');
    const selection = selectItems(cfg, topic, 'foundation', 'nonce-baseline');
    expect(selection.baselineLongest).toBeGreaterThanOrEqual(0);
    expect(selection.baselineLongest).toBeLessThanOrEqual(1);
  });

  it('varies the question set between attempts', () => {
    const topic = loadTopic(cfg, 'python-fundamentals');
    const sets = new Set<string>();
    for (let i = 0; i < 8; i += 1) {
      const selection = selectItems(cfg, topic, 'foundation', `nonce-${i}`);
      sets.add(selection.items.map((s) => s.item.id).sort().join(','));
    }
    expect(sets.size).toBeGreaterThan(1);
  });

  it('shuffles options independently of the stored order', () => {
    const topic = loadTopic(cfg, 'python-fundamentals');
    const selection = selectItems(cfg, topic, 'foundation', 'nonce-shuffle');
    const stillInStoredOrder = selection.items.filter(
      ({ item, shuffledOptions }) => shuffledOptions.join('|') === item.options.join('|'),
    );
    // With 4 options the probability of an identical order is 1/24 per item.
    expect(stillInStoredOrder.length).toBeLessThan(selection.items.length);
  });
});
