// ────────────────────────────────────────────────────────────
// RRRTX FreeVerse — assessment lifecycle contract tests.
//
// These tests defend the *published policy*: the level matrix,
// prerequisites, pass marks, selection pool rules and the catalog
// the browser is allowed to see. They are the evidence behind the
// level tables in ASSESSMENT_QUALITY.md.
//
// The tests read the committed bank (server/bank) exactly as the
// server does. They never modify it.
// ────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import catalogJson from '../src/data/bankCatalog.json';
import { LEVELS, LEVEL_ORDER, credentialDefinitionId } from '../shared/levels';
import type { Catalog, CatalogTopic, LevelId } from '../shared/contracts';
import { __resetBankCacheForTests, loadManifest, loadTopic, selectItems } from '../server/core/bank';
import { testConfig } from './helpers';

const catalog = catalogJson as unknown as Catalog;
const cfg = testConfig();

// ── Recursive key walk: nothing answer-shaped may be published ──
function collectKeys(value: unknown, out: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) {
    value.forEach((v) => collectKeys(v, out));
  } else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      out.add(key);
      collectKeys(child, out);
    }
  }
  return out;
}

const FORBIDDEN_CATALOG_KEYS = [
  'answer',
  'answerIndex',
  'answer_index',
  'answer_commit',
  'explanation',
  'explanation_enc',
  'correctOptionIndex',
  'options', // option text is served per attempt, never in the catalog
  'subPools',
];

describe('published catalog contract', () => {
  it('covers all 15 topics with three levels each', () => {
    expect(catalog.schema).toBe('rfv.catalog/2');
    expect(catalog.topics).toHaveLength(15);
    for (const topic of catalog.topics) {
      expect(topic.levels.map((l) => l.id)).toEqual(LEVEL_ORDER);
    }
  });

  it('never publishes answer keys, options or explanations', () => {
    const keys = collectKeys(catalog.topics);
    for (const forbidden of FORBIDDEN_CATALOG_KEYS) {
      expect(keys.has(forbidden), `catalog leaked key "${forbidden}"`).toBe(false);
    }
  });

  it('matches the server manifest level-by-level (availability, pass mark, count, duration)', () => {
    const manifest = loadManifest();
    for (const topic of catalog.topics) {
      const manifestTopic = manifest.topics.find((t) => t.id === topic.id);
      expect(manifestTopic, `no manifest entry for ${topic.id}`).toBeTruthy();
      expect(manifestTopic!.questionCount).toBe(topic.questionCount);
      expect(manifestTopic!.quality.assessmentIntegrity).toBe(topic.quality.assessmentIntegrity);
      expect(manifestTopic!.quality.servableBaseline).toBeCloseTo(topic.quality.servableBaseline, 10);
      expect(manifestTopic!.quality.approvedBaseline).toBeCloseTo(topic.quality.approvedBaseline, 10);

      for (const level of topic.levels) {
        const policy = LEVELS[level.id];
        expect(level.passingScore).toBe(policy.passingScore);
        expect(level.questionCount).toBe(policy.selection.questionCount);
        expect(level.durationSec).toBe(policy.durationSec);
        expect(level.requiresLevel).toBe(policy.requiresLevel);
        expect(manifestTopic!.levels[level.id].available).toBe(level.available);
      }
    }
  });

  it('declares an integrity status that is consistent with the published baseline', () => {
    for (const topic of catalog.topics) {
      const headroom = LEVELS.foundation.passingScore / 100 - 0.1;
      const expected = topic.quality.servableBaseline <= headroom ? 'verified' : 'under-review';
      expect(topic.quality.assessmentIntegrity, topic.id).toBe(expected);
      expect(topic.quality.lengthHeuristicRisk).toBe(
        topic.quality.servableBaseline >= LEVELS.foundation.passingScore / 100,
      );
      expect(topic.quality.approved + topic.quality.provisional + topic.quality.rejected).toBe(
        topic.questionCount,
      );
    }
  });
});

describe('level policy', () => {
  it('chains prerequisites foundation → intermediate → advanced', () => {
    expect(LEVELS.foundation.requiresLevel).toBeNull();
    expect(LEVELS.intermediate.requiresLevel).toBe('foundation');
    expect(LEVELS.advanced.requiresLevel).toBe('intermediate');
  });

  it('never makes a level available when its prerequisite is unavailable', () => {
    for (const topic of catalog.topics) {
      for (const level of topic.levels) {
        if (!level.available || !level.requiresLevel) continue;
        const prerequisite = topic.levels.find((l) => l.id === level.requiresLevel);
        expect(prerequisite?.available, `${topic.id}:${level.id} without ${level.requiresLevel}`).toBe(true);
      }
    }
  });

  it('keeps pass marks and time budgets monotonic across levels', () => {
    for (const topic of catalog.topics) {
      const [foundation, intermediate, advanced] = topic.levels;
      expect(intermediate.passingScore).toBeGreaterThanOrEqual(foundation.passingScore);
      expect(advanced.passingScore).toBeGreaterThanOrEqual(intermediate.passingScore);
      expect(intermediate.durationSec).toBeGreaterThanOrEqual(foundation.durationSec);
      expect(advanced.durationSec).toBeGreaterThanOrEqual(intermediate.durationSec);
    }
  });

  it('names a stable credential definition per topic and level', () => {
    for (const topic of catalog.topics) {
      for (const level of topic.levels) {
        expect(credentialDefinitionId(topic.id, level.id)).toMatch(/^rfv\.cred\.[a-z0-9-]+\.(foundation|intermediate|advanced)$/);
      }
    }
  });
});

describe('blueprint selection', () => {
  const topics: CatalogTopic[] = catalog.topics;

  it('serves exactly the promised number of items, with no duplicates, for every available level', () => {
    __resetBankCacheForTests();
    let servedLevels = 0;
    for (const topic of topics) {
      const bank = loadTopic(cfg, topic.id);
      for (const level of topic.levels) {
        if (!level.available) continue;
        servedLevels += 1;
        const selection = selectItems(cfg, bank, level.id as LevelId, `nonce-${topic.id}-${level.id}`);
        expect(selection.items, `${topic.id}:${level.id} size`).toHaveLength(level.questionCount);
        const refs = new Set(selection.items.map((i) => i.item.ref));
        expect(refs.size, `${topic.id}:${level.id} duplicates`).toBe(level.questionCount);
        // The declared coverage must be what the runtime actually serves: a
        // level that claims 16 of 20 skill areas must show exactly 4 gaps.
        const declaredGaps = topic.skills.length - level.skillCoverage.assessed;
        expect(selection.coverageGaps, `${topic.id}:${level.id} declared gaps`).toHaveLength(declaredGaps);
      }
    }
    // 15 topics × (foundation + intermediate) + 3 advanced topics.
    expect(servedLevels).toBe(33);
  });

  it('refuses to assemble a level whose reviewed pool is too small (fail-closed)', () => {
    __resetBankCacheForTests();
    let refused = 0;
    for (const topic of topics) {
      const bank = loadTopic(cfg, topic.id);
      for (const level of topic.levels) {
        if (level.available) continue;
        refused += 1;
        expect(
          () => selectItems(cfg, bank, level.id as LevelId, `unavailable-${topic.id}-${level.id}`),
          `${topic.id}:${level.id} should refuse`,
        ).toThrow(/reviewed item|not enough reviewed questions|no reviewed questions/i);
      }
    }
    // 12 topics without an Advanced blueprint.
    expect(refused).toBe(12);
  });

  it('never serves a withheld item, at any available level', () => {
    __resetBankCacheForTests();
    for (const topic of topics) {
      const bank = loadTopic(cfg, topic.id);
      const withheld = new Set(bank.items.filter((i) => i.reviewStatus === 'rejected').map((i) => i.ref));
      for (const levelId of LEVEL_ORDER) {
        let selection;
        try {
          selection = selectItems(cfg, bank, levelId, `withheld-check-${topic.id}-${levelId}`);
        } catch {
          continue; // unavailable level: covered by the fail-closed test above
        }
        for (const item of selection.items) {
          expect(withheld.has(item.item.ref), `${topic.id}:${levelId} served withheld ${item.item.ref}`).toBe(false);
        }
      }
    }
  });

  it('publishes availability that matches the reviewed pool exactly', () => {
    const manifest = loadManifest();
    for (const topic of catalog.topics) {
      const manifestTopic = manifest.topics.find((t) => t.id === topic.id)!;
      for (const level of topic.levels) {
        const useApprovedPool = LEVELS[level.id].selection.pool === 'approved';
        const eligibleItems = useApprovedPool
          ? topic.quality.approved
          : topic.quality.approved + topic.quality.provisional;
        const eligibleSkills = manifestTopic.skills.filter((s) =>
          useApprovedPool ? s.approved > 0 : s.serviceable > 0,
        ).length;
        const expected =
          eligibleItems >= level.questionCount && eligibleSkills >= level.skillCoverage.minRequired;
        expect(level.available, `${topic.id}:${level.id} availability`).toBe(expected);
        expect(level.skillCoverage.assessed, `${topic.id}:${level.id} assessed skills`).toBe(eligibleSkills);
        expect(level.skillCoverage.total).toBe(manifestTopic.skills.length);
        if (!expected) {
          expect(level.unavailableReason, `${topic.id}:${level.id} needs a measured reason`).toMatch(/reviewed item/i);
        }
      }
    }
  });

  it('reserves the Advanced blueprint for items that passed every automated check', () => {
    __resetBankCacheForTests();
    let advancedTopics = 0;
    for (const topic of topics) {
      const advanced = topic.levels.find((l) => l.id === 'advanced');
      if (!advanced?.available) continue;
      advancedTopics += 1;
      const bank = loadTopic(cfg, topic.id);
      const selection = selectItems(cfg, bank, 'advanced', `approved-check-${topic.id}`);
      for (const item of selection.items) {
        expect(item.item.reviewStatus, `${topic.id} advanced served ${item.item.reviewStatus}`).toBe('approved');
      }
    }
    expect(advancedTopics).toBe(3);
  });

  it('varies the served set between attempts and shuffles option order', () => {
    __resetBankCacheForTests();
    const bank = loadTopic(cfg, 'python-fundamentals');
    const first = selectItems(cfg, bank, 'foundation', 'nonce-one');
    const second = selectItems(cfg, bank, 'foundation', 'nonce-two');
    const firstRefs = first.items.map((i) => i.item.ref).sort();
    const secondRefs = second.items.map((i) => i.item.ref).sort();
    expect(firstRefs).not.toEqual(secondRefs);

    // Every served item must present its options in an order that differs from
    // the sealed order for at least some items (a shuffle that did nothing
    // would indicate a broken permutation).
    const shuffled = first.items.filter((i) => i.shuffledOptions.join('\u0000') !== i.item.options.join('\u0000'));
    expect(shuffled.length).toBeGreaterThan(0);
  });
});
