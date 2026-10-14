// ────────────────────────────────────────────────────────────
// GET /api/catalog — the integration surface for companion apps
//
// LearnPath (and anything else in the RRRTX family) needs to know
// three things without scraping the UI:
//   1. which credentials exist, with their stable definition ids;
//   2. where to send a learner to verify one (the authoritative
//      endpoint is /api/verify — this app owns credential state);
//   3. which LearnPath material a topic overlaps, if any.
//
// Everything here is public by design: the same catalog data already
// ships in the client bundle. It contains no answer keys, no item
// text, no recipient data and no secrets, and it is served with an
// explicit cache header because it changes only when the bank is
// rebuilt. Honest flags travel with it: a topic whose item bank is
// under review says so, so a consumer cannot present it as better
// than it is.
// ────────────────────────────────────────────────────────────

import type { CatalogIntegrationResponse, IntegrationTopic } from '../shared/contracts';
import { CREDENTIAL_DISCLOSURE } from '../shared/levels';
import {
  LEARNPATH_MAP,
  LEARNPATH_REF,
  LEARNPATH_SITE,
  learnpathDeepLink,
  learnpathMapping,
  learnpathRoadmapTitle,
  learnpathSkillTitle,
  learnpathSkillUrl,
  learnpathUnmappedReason,
} from '../shared/learnpath';
import { credentialDefinitionId, LEVELS, LEVEL_ORDER } from '../shared/levels';
import { bankKeyId, DEV_BANK_KEY, loadManifest } from '../server/core/bank';
import { context, publicBaseUrl } from '../server/core/context';
import { clientIp, defineRoute, jsonResponse, preflight, PUBLIC_CORS, requireMethod } from '../server/core/http';
import { enforceRateLimit } from '../server/core/ratelimit';

const CATALOG_CACHE = 'public, max-age=300, stale-while-revalidate=600';

export default defineRoute(async (req) => {
  const flight = preflight(req);
  if (flight) return flight;
  requireMethod(req, 'GET');

  const { cfg } = context();
  enforceRateLimit(`catalog:${clientIp(req)}`, cfg.limits.verify, cfg.limits.windowMs);

  const manifest = loadManifest();
  const origin = publicBaseUrl(req, cfg);
  const devSealed = manifest.keyId === bankKeyId(DEV_BANK_KEY);

  const topics: IntegrationTopic[] = manifest.topics.map((topic) => {
    const mapping = learnpathMapping(topic.id);
    return {
      id: topic.id,
      title: topic.title,
      category: topic.category,
      skillId: topic.skillId,
      estimatedMinutes: topic.estimatedMinutes,
      questionCount: topic.questionCount,
      skillAreaCount: topic.skills.length,
      levelCount: LEVEL_ORDER.length,
      levels: LEVEL_ORDER.map((levelId) => {
        const spec = LEVELS[levelId];
        const status = topic.levels[levelId];
        return {
          id: levelId,
          definitionId: credentialDefinitionId(topic.id, levelId),
          blueprintId: status?.blueprintId ?? null,
          label: spec.label,
          available: Boolean(status?.available),
          unavailableReason: status?.reason ?? null,
          questionCount: spec.selection.questionCount,
          passingScore: spec.passingScore,
          durationSec: spec.durationSec,
          requiresLevel: spec.requiresLevel,
          skillCoverage: status?.skillCoverage ?? null,
        };
      }),
      quality: {
        assessmentIntegrity: topic.quality.assessmentIntegrity,
        lengthHeuristicRisk: topic.quality.lengthHeuristicRisk,
        approved: topic.quality.approved,
        provisional: topic.quality.provisional,
        rejected: topic.quality.rejected,
      },
      learnpath: mapping
        ? {
            unmappedReason: null,
            primaryRoadmap: mapping.primaryRoadmap,
            primaryRoadmapTitle: learnpathRoadmapTitle(mapping.primaryRoadmap),
            primaryRoadmapUrl: `${LEARNPATH_SITE}/roadmaps/${mapping.primaryRoadmap}`,
            entries: mapping.entries.map((entry) => ({
              roadmap: entry.roadmap,
              roadmapTitle: learnpathRoadmapTitle(entry.roadmap),
              confidence: entry.confidence,
              note: entry.note,
              skills: entry.skills.map((skillId) => ({
                skillId,
                title: learnpathSkillTitle(skillId) ?? skillId,
                url: learnpathSkillUrl(entry.roadmap, skillId),
              })),
            })),
            // Deep links for individual FreeVerse skill areas, for placement
            // next to a per-skill score in a result view.
            skillLinks: topic.skills
              .map((skill) => {
                const deep = learnpathDeepLink(topic.id, skill.skillId);
                if (!deep) return null;
                return {
                  freeverseSkillId: skill.skillId,
                  skillName: skill.name,
                  learnpathSkillId: deep.skill,
                  learnpathSkillTitle: deep.title,
                  url: learnpathSkillUrl(deep.roadmap, deep.skill),
                };
              })
              .filter((entry): entry is NonNullable<typeof entry> => entry !== null),
          }
        : {
            unmappedReason:
              learnpathUnmappedReason(topic.id) ??
              'No companion learning path is published for this topic.',
            primaryRoadmap: null,
            primaryRoadmapTitle: null,
            primaryRoadmapUrl: null,
            entries: [],
            skillLinks: [],
          },
    };
  });

  const body: CatalogIntegrationResponse = {
    schema: 'rfv.integration/1',
    bankVersion: manifest.bankVersion,
    generatedAt: manifest.generatedAt,
    checkedAt: new Date().toISOString(),
    origin,
    authoritative: {
      // FreeVerse owns assessment and credential state; consumers must ask here
      // rather than caching a snapshot of "valid" for any length of time.
      verification: 'FreeVerse is the only authority for whether a credential is valid, revoked or unverifiable.',
      verify: { method: 'GET', path: '/api/verify', query: { id: 'RFV-YYYY-XXXXXXXX' }, urlTemplate: `${origin}/api/verify?id={id}` },
      verifyStates: ['valid', 'revoked', 'not-found', 'invalid-id', 'registry-unavailable', 'unauthenticated-record'],
      credentialPath: 'certs/YYYY/MM/<id>.json',
      registryRepo: `${cfg.registry.owner}/${cfg.registry.repo}`,
      issuerKeyPath: 'issuer-keys/<keyId>.json',
    },
    endpoints: {
      attempt: { method: 'POST', path: '/api/attempt' },
      grade: { method: 'POST', path: '/api/grade' },
      result: { method: 'POST', path: '/api/result' },
      credential: { method: 'POST', path: '/api/credential' },
      issueCertificateLegacy: { method: 'POST', path: '/api/issue-cert', status: 'gone (410) — issuance now requires a signed passing attempt' },
    },
    disclosure: CREDENTIAL_DISCLOSURE,
    bank: {
      version: manifest.bankVersion,
      topics: manifest.topics.length,
      items: manifest.totals.questions,
      underReviewTopics: manifest.topics.filter((t) => t.quality.assessmentIntegrity !== 'verified').length,
      productionSealed: !devSealed,
    },
    learnpath: {
      site: LEARNPATH_SITE,
      repo: LEARNPATH_MAP.learnpath.repo,
      ref: LEARNPATH_REF,
      note: 'A mapping is a "learn next" link from a credential to material that overlaps it. It is never an equivalence claim, and FreeVerse does not grade or accredit LearnPath.',
      mappedTopics: LEARNPATH_MAP.mappings.length,
      unmappedTopics: LEARNPATH_MAP.unmapped.length,
    },
    topics,
  };

  return jsonResponse(body, 200, { ...PUBLIC_CORS, 'Cache-Control': CATALOG_CACHE });
});

