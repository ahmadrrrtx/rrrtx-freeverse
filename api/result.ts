// ────────────────────────────────────────────────────────────
// POST /api/result — re-read a finalised attempt from its signed result token
//
// Why this exists: the result page must not change when the page is
// refreshed, and it must not be possible to make the browser show a
// score the server never produced. The browser keeps the token; the
// server re-derives the authoritative numbers from it on every load.
// ────────────────────────────────────────────────────────────

import type { AttemptResult } from '../shared/contracts';
import { LEVELS, type LevelId } from '../shared/levels';
import { manifestTopic } from '../server/core/bank';
import { context, requireGrading } from '../server/core/context';
import { ApiError, assertSameOrigin, clientIp, defineRoute, isPlainObject, jsonResponse, readJsonBody, requireMethod } from '../server/core/http';
import { enforceRateLimit } from '../server/core/ratelimit';
import { verifyToken, type ResultTokenPayload } from '../server/core/tokens';

export default defineRoute(async (req) => {
  const { cfg } = context();
  requireMethod(req, 'POST');
  assertSameOrigin(req, cfg);
  requireGrading(cfg);
  enforceRateLimit(`result:${clientIp(req)}`, cfg.limits.rereadResult, cfg.limits.windowMs);

  const body = await readJsonBody<{ resultToken?: string }>(req);
  if (!isPlainObject(body) || typeof body.resultToken !== 'string') {
    throw new ApiError('invalid_result', 'resultToken is required.');
  }

  const verified = verifyToken<ResultTokenPayload>(cfg.signingSecret!, body.resultToken, 'result');
  if (!verified.ok) throw new ApiError('invalid_result', 'This result token is not valid.');
  const payload = verified.payload;

  const level = LEVELS[payload.l as LevelId];
  const manifest = manifestTopic(payload.t);

  const summary: AttemptResult & { reviewUnavailable?: boolean } = {
    schema: 'rfv.result/1',
    resultToken: body.resultToken,
    topicId: payload.t,
    level: payload.l as LevelId,
    topicTitle: manifest?.title ?? payload.t,
    score: payload.s,
    correctCount: payload.c,
    totalCount: payload.x,
    passed: payload.ok,
    passingScore: level?.passingScore ?? 80,
    durationUsedSec: 0,
    submittedAt: new Date(payload.i).toISOString(),
    reason: (payload.rs as AttemptResult['reason']) ?? 'submitted',
    integrity: { selfReportedViolations: payload.sv, reviewDisclosure: 'aggregate-only' },
    breakdown: [],
    strengths: [],
    needsWork: [],
    review: [],
    recommendations: [],
    retake: {
      eligible: true,
      nextAvailableAt: new Date(payload.i + (payload.ok ? level.retakeAfterPassHours : level.retakeAfterFailHours) * 3600 * 1000).toISOString(),
      policy: payload.ok
        ? `A retake is allowed ${level.retakeAfterPassHours} hours after a pass.`
        : `A retake is allowed ${level.retakeAfterFailHours} hours after a failed attempt.`,
    },
    credentialEligible: payload.ok,
    // Per-item review is not stored anywhere (privacy + no database), so a
    // reloaded page shows the authoritative score without the item detail.
    reviewUnavailable: true,
  };

  return jsonResponse(summary);
});
