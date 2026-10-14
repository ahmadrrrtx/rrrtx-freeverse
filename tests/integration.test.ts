// ────────────────────────────────────────────────────────────
// Companion-app integration (LearnPath) and the public catalog.
//
// Two things are locked down here:
//   1. the mapping file cannot drift into claims that do not exist —
//      every LearnPath slug must be in the recorded taxonomy and must
//      be a node of the roadmap it is linked from, every FreeVerse
//      topic must have an explicit mapped/unmapped decision, and
//      nothing may link to a URL the other site does not serve;
//   2. /api/catalog is public-read, machine-readable and free of
//      anything that must stay server-side (answers, explanations,
//      recipients, secrets) — while state-changing routes keep
//      refusing cross-site callers.
// ────────────────────────────────────────────────────────────

import { afterEach, describe, expect, it } from 'vitest';
import catalogRoute from '../api/catalog';
import verifyRoute from '../api/verify';
import startAttemptRoute from '../api/attempt';
import type { CatalogIntegrationResponse } from '../shared/contracts';
import {
  LEARNPATH_MAP,
  LEARNPATH_SITE,
  learnpathDeepLink,
  learnpathMapping,
  learnpathResourceUrl,
  learnpathUnmappedReason,
  referencedLearnpathSkills,
} from '../shared/learnpath';
import { clearContext, installContext, FakeRegistry, jsonRequest, testConfig } from './helpers';
import { resetRateLimits } from '../server/core/ratelimit';
import manifest from '../server/bank/manifest.json';

const TOPICS = manifest.topics.map((t) => t.id);
const SKILL_IDS = new Set(LEARNPATH_MAP.learnpath.skills.map((s) => s.id));
const ROADMAP_NODES = new Map(LEARNPATH_MAP.learnpath.roadmaps.map((r) => [r.id, new Set(r.skills)]));

/**
 * Route handlers are typed as `Response | void` (they support both the Web and
 * the Vercel Node calling convention). Tests call them Web-style, so narrow once
 * here instead of scattering casts.
 */
async function callRoute(handler: unknown, req: Request): Promise<Response> {
  const res = await (handler as (r: Request) => Promise<Response | void>)(req);
  if (!res) throw new Error('route returned nothing — wrong calling convention');
  return res;
}

function setup() {
  const cfg = testConfig();
  installContext(cfg, new FakeRegistry(cfg));
  resetRateLimits();
  return cfg;
}

function walk(value: unknown, visit: (key: string, value: unknown) => void, key = ''): void {
  visit(key, value);
  if (Array.isArray(value)) value.forEach((v) => walk(v, visit, key));
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) walk(v, visit, k);
}

afterEach(() => {
  clearContext();
});

describe('LearnPath mapping file', () => {
  it('records the repository and commit the taxonomy was read from', () => {
    expect(LEARNPATH_MAP.schema).toBe('rfv.learnpath-map/1');
    expect(LEARNPATH_MAP.learnpath.repo).toBe('RRRTX-Labs/LearnPath');
    expect(LEARNPATH_MAP.learnpath.ref).toMatch(/^[0-9a-f]{40}$/);
    expect(LEARNPATH_SITE).toMatch(/^https:\/\//);
    expect(LEARNPATH_MAP.learnpath.roadmaps.length).toBeGreaterThan(0);
    expect(LEARNPATH_MAP.learnpath.skills.length).toBeGreaterThan(0);
  });

  it('gives every FreeVerse topic exactly one explicit decision', () => {
    const mapped = LEARNPATH_MAP.mappings.map((m) => m.topicId);
    const unmapped = LEARNPATH_MAP.unmapped.map((u) => u.topicId);
    expect(new Set(mapped).size).toBe(mapped.length);
    expect(new Set(unmapped).size).toBe(unmapped.length);
    expect([...mapped, ...unmapped].sort()).toEqual([...TOPICS].sort());
    for (const id of [...mapped, ...unmapped]) expect(TOPICS).toContain(id);
    expect(mapped.filter((t) => unmapped.includes(t))).toEqual([]);
    // Every unmapped topic carries a reason a human can read.
    for (const entry of LEARNPATH_MAP.unmapped) expect(entry.reason.length).toBeGreaterThan(40);
  });

  it('only references LearnPath skills that exist at the recorded ref', () => {
    for (const skillId of referencedLearnpathSkills()) {
      expect(SKILL_IDS.has(skillId), `${skillId} is not in the recorded taxonomy`).toBe(true);
    }
  });

  it('only links to a roadmap that actually contains the skill', () => {
    for (const mapping of LEARNPATH_MAP.mappings) {
      for (const entry of mapping.entries) {
        const nodes = ROADMAP_NODES.get(entry.roadmap);
        expect(nodes, `unknown roadmap ${entry.roadmap}`).toBeTruthy();
        for (const skillId of entry.skills) {
          expect(nodes!.has(skillId), `${skillId} is not a node of ${entry.roadmap}`).toBe(true);
        }
      }
      expect(mapping.entries.some((e) => e.roadmap === mapping.primaryRoadmap)).toBe(true);
    }
  });

  it('deep links only point at real FreeVerse skill areas and real LearnPath nodes', () => {
    for (const [topicId, deep] of Object.entries(LEARNPATH_MAP.deepLinks)) {
      const topic = manifest.topics.find((t) => t.id === topicId);
      expect(topic, `unknown topic ${topicId}`).toBeTruthy();
      const freeverseSkillIds = new Set(topic!.skills.map((s) => s.skillId));
      const nodes = ROADMAP_NODES.get(deep.roadmap);
      expect(nodes, `unknown deep-link roadmap ${deep.roadmap}`).toBeTruthy();
      for (const [freeverseSkillId, learnpathSkillId] of Object.entries(deep.skills)) {
        expect(freeverseSkillIds.has(freeverseSkillId), `${freeverseSkillId} is not a skill of ${topicId}`).toBe(true);
        expect(SKILL_IDS.has(learnpathSkillId), `${learnpathSkillId} is not published`).toBe(true);
        expect(nodes!.has(learnpathSkillId), `${learnpathSkillId} is not a node of ${deep.roadmap}`).toBe(true);
      }
    }
  });

  it('builds links on the real LearnPath route shapes, never a guessed one', () => {
    const url = learnpathResourceUrl('python-fundamentals', 'rfv.skill.python-fundamentals.02-syntax-and-indentation');
    expect(url).toBe(`${LEARNPATH_SITE}/learn/python-developer/python-syntax`);

    const roadmapLevel = learnpathResourceUrl('git-github', 'rfv.skill.git-github.17-github-actions-and-ci');
    expect(roadmapLevel).toBe(`${LEARNPATH_SITE}/roadmaps/full-stack-developer`);
    expect(roadmapLevel).not.toContain('/learn/skill/');
  });

  it('returns null instead of a dead link when LearnPath has nothing to offer', () => {
    for (const { topicId } of LEARNPATH_MAP.unmapped) {
      expect(learnpathMapping(topicId)).toBeNull();
      expect(learnpathUnmappedReason(topicId)).toBeTruthy();
      expect(learnpathResourceUrl(topicId, `rfv.skill.${topicId}.01-anything`)).toBeNull();
      expect(learnpathDeepLink(topicId, `rfv.skill.${topicId}.01-anything`)).toBeNull();
    }
  });
});

describe('GET /api/catalog', () => {
  async function fetchCatalog(): Promise<{ status: number; body: CatalogIntegrationResponse; headers: Headers }> {
    const res = await callRoute(catalogRoute, new Request('https://app.test/api/catalog', { method: 'GET' }));
    return { status: res.status, body: (await res.json()) as CatalogIntegrationResponse, headers: res.headers };
  }

  it('publishes the credential catalog with stable definition ids', async () => {
    setup();
    const { status, body } = await fetchCatalog();
    expect(status).toBe(200);
    expect(body.schema).toBe('rfv.integration/1');
    expect(body.topics.map((t) => t.id).sort()).toEqual([...TOPICS].sort());

    for (const topic of body.topics) {
      expect(topic.levels.map((l) => l.definitionId)).toEqual([
        `rfv.cred.${topic.id}.foundation`,
        `rfv.cred.${topic.id}.intermediate`,
        `rfv.cred.${topic.id}.advanced`,
      ]);
      for (const level of topic.levels) {
        expect(level.questionCount).toBe(20);
        expect(level.passingScore).toBeGreaterThanOrEqual(80);
        if (!level.available) expect(level.unavailableReason).toBeTruthy();
      }
      // Honest quality flags travel with the catalog.
      expect(topic.quality.assessmentIntegrity).toBe('under-review');
      expect(typeof topic.quality.lengthHeuristicRisk).toBe('boolean');
    }
  });

  it('points consumers at the authoritative verification endpoint', async () => {
    setup();
    const { body } = await fetchCatalog();
    expect(body.authoritative.verify.path).toBe('/api/verify');
    expect(body.authoritative.verify.urlTemplate).toContain('{id}');
    expect(body.authoritative.registryRepo).toContain('/');
    expect(body.authoritative.verifyStates).toEqual([
      'valid', 'revoked', 'not-found', 'invalid-id', 'registry-unavailable', 'unauthenticated-record',
    ]);
    // The legacy issuance endpoint must be advertised as closed.
    expect(JSON.stringify(body.endpoints.issueCertificateLegacy)).toMatch(/410|gone/i);
  });

  it('carries no answer keys, item text, recipients or secrets', async () => {
    setup();
    const { body } = await fetchCatalog();
    const forbidden = [
      'answer', 'answerindex', 'answer_commit', 'explanation', 'explanation_enc',
      'correctoption', 'correct_option_index', 'sealed', 'recipient', 'displayname',
      'display_name', 'email', 'email_hash', 'token', 'secret', 'signing',
      'prompt', 'options', 'itempool', 'item_pool', 'keyId', 'keyid',
    ];
    const hits: string[] = [];
    walk(body, (key) => {
      const k = key.toLowerCase();
      // `skillId`, `blueprintId` and similar are fine; only exact prohibited names matter.
      if (forbidden.includes(k)) hits.push(k);
    });
    expect(hits).toEqual([]);

    // The disclosure text legitimately says "graded against a private answer key";
    // nothing else may mention answers, explanations or item content.
    const withoutProse = JSON.stringify({ ...body, disclosure: {} });
    expect(withoutProse).not.toMatch(/answer|explanation|option/i);
  });

  it('is readable cross-origin and cacheable (public read-only data)', async () => {
    setup();
    const { headers } = await fetchCatalog();
    expect(headers.get('access-control-allow-origin')).toBe('*');
    expect(headers.get('cache-control')).toMatch(/max-age=\d+/);
  });

  it('answers a CORS preflight for companion apps', async () => {
    setup();
    const res = await callRoute(catalogRoute, new Request('https://app.test/api/catalog', { method: 'OPTIONS' }));
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
    expect(res.headers.get('access-control-allow-methods')).toContain('GET');
  });

  it('rejects non-GET methods', async () => {
    setup();
    const res = await callRoute(catalogRoute, new Request('https://app.test/api/catalog', { method: 'DELETE' }));
    expect(res.status).toBe(400);
  });
});

describe('cross-origin policy', () => {
  it('lets another app verify a credential from its own origin', async () => {
    setup();
    const res = await callRoute(
      verifyRoute,
      new Request('https://app.test/api/verify?id=RFV-2026-00000000', {
        method: 'GET',
        headers: { Origin: 'https://learn-path-theta.vercel.app', 'Sec-Fetch-Site': 'cross-site' },
      }),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).state).toBe('not-found');
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });

  it('still refuses a cross-site attempt to start an assessment', async () => {
    setup();
    const res = await callRoute(
      startAttemptRoute,
      jsonRequest('https://app.test/api/attempt', {
        topicId: 'python-fundamentals',
        level: 'foundation',
        recipient: { displayName: 'Ada Lovelace', email: 'ada@example.test' },
      }),
    );
    expect(res.status).toBe(200);

    const forged = new Request('https://app.test/api/attempt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example', 'Sec-Fetch-Site': 'cross-site' },
      body: JSON.stringify({
        topicId: 'python-fundamentals',
        level: 'foundation',
        recipient: { displayName: 'Ada Lovelace', email: 'ada@example.test' },
      }),
    });
    const blocked = await callRoute(startAttemptRoute, forged);
    expect(blocked.status).toBe(403);
    expect((await blocked.json()).error.code).toBe('origin_rejected');
  });
});
