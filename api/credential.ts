// ────────────────────────────────────────────────────────────
// POST /api/credential — issue a credential
//
// Preconditions enforced here (all server-side):
//   1. a valid, unexpired result token signed by this server;
//   2. that result passed;
//   3. the submitted recipient matches the identity the attempt
//      was bound to (so a result cannot be transferred);
//   4. the registry write succeeds — otherwise nothing is issued.
// The credential id is derived from the attempt nonce, so replays
// and retries resolve to the same credential instead of a new one.
// ────────────────────────────────────────────────────────────

import type { IssueCredentialRequest, IssueCredentialResponse } from '../shared/contracts';
import { loadTopic, manifestTopic } from '../server/core/bank';
import { context, publicBaseUrl, requireIssuance } from '../server/core/context';
import { recipientRef } from '../server/core/crypto';
import { ApiError, assertSameOrigin, clientIp, defineRoute, isPlainObject, jsonResponse, logEvent, readJsonBody, requireMethod, sanitizeEmail, sanitizeText } from '../server/core/http';
import { issueCredential } from '../server/core/issuer';
import { enforceRateLimit } from '../server/core/ratelimit';
import { verifyToken, type ResultTokenPayload } from '../server/core/tokens';

export default defineRoute(async (req) => {
  const { cfg, registry } = context();
  requireMethod(req, 'POST');
  assertSameOrigin(req, cfg);
  requireIssuance(cfg);

  enforceRateLimit(`credential:${clientIp(req)}`, cfg.limits.issueCredential, cfg.limits.windowMs);

  const body = await readJsonBody<IssueCredentialRequest>(req);
  if (!isPlainObject(body) || typeof body.resultToken !== 'string') {
    throw new ApiError('invalid_result', 'resultToken is required.');
  }
  if (!isPlainObject(body.recipient)) throw new ApiError('bad_request', 'recipient is required.');

  const displayName = sanitizeText((body.recipient as Record<string, unknown>).displayName, { min: 2, max: 64, field: 'display name' });
  const email = sanitizeEmail((body.recipient as Record<string, unknown>).email);

  // ── 1. The token must be a genuine, unexpired result ──
  const verified = verifyToken<ResultTokenPayload>(cfg.signingSecret!, body.resultToken, 'result');
  if (!verified.ok) {
    throw new ApiError('invalid_result', verified.reason === 'expired' ? 'This result token has expired; re-take the assessment.' : 'This result token is not valid.');
  }
  const payload = verified.payload;

  // ── 2. It must be a pass ──
  if (!payload.ok) throw new ApiError('not_passed', 'This attempt did not pass, so no credential can be issued.');

  // ── 3. Identity binding: same person who took the attempt ──
  const expected = recipientRef(cfg.signingSecret!, displayName, email);
  if (expected !== payload.r) {
    throw new ApiError('invalid_result', 'This result belongs to a different recipient. Re-take the assessment with these details.');
  }

  const topic = loadTopic(cfg, payload.t);
  const manifest = manifestTopic(payload.t);

  // Skills actually assessed in this attempt, derived from the served refs.
  // The record states the coverage explicitly so a verifier can see whether a
  // level examined every skill area of the topic or only most of them.
  const skillMap = new Map<string, string>();
  for (const ref of payload.q ?? []) {
    const item = topic.refIndex.get(ref);
    if (item) skillMap.set(item.skillId, item.skillName);
  }
  const skills = [...skillMap.entries()].map(([skillId, name]) => ({ skillId, name }));
  const skillGaps = topic.skills.filter((s) => !skillMap.has(s.skillId)).map((s) => s.skillId);

  const outcome = await issueCredential({
    cfg,
    registry,
    payload: { ...payload, q: payload.q },
    displayName,
    learnerRef: payload.lr,
    topicTitle: topic.title,
    skills,
    qualityStatus: manifest?.quality.assessmentIntegrity ?? 'under-review',
    itemPool: skills.length && payload.l === 'advanced' ? 'approved' : 'approved_or_provisional',
    skillCoverage: { assessed: skills.length, total: topic.skills.length },
    skillGaps,
    issuerUrl: publicBaseUrl(req, cfg),
  });

  logEvent('credential_issued', {
    id: outcome.credential.id,
    topic: payload.t,
    level: payload.l,
    alreadyIssued: outcome.alreadyIssued,
    provenance: outcome.credential.provenance,
  });

  const response: IssueCredentialResponse = {
    credential: outcome.credential,
    alreadyIssued: outcome.alreadyIssued,
    registryUrl: outcome.registryUrl,
  };
  return jsonResponse(response, outcome.alreadyIssued ? 200 : 201);
});
