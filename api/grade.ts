// ────────────────────────────────────────────────────────────
// POST /api/grade — submit answers, receive a server-graded result
//
// The request may only carry option positions the server issued
// (rebuilt deterministically from the attempt nonce) plus an
// advisory submission reason. Score, pass/fail and credential
// eligibility are decided here.
// ────────────────────────────────────────────────────────────

import type { AttemptResult, SubmitAttemptRequest, SubmitReason } from '../shared/contracts';
import { LEVELS, type LevelId } from '../shared/levels';
import { assertDeployableKey, loadTopic } from '../server/core/bank';
import { context, requireGrading } from '../server/core/context';
import { sha256Hex } from '../server/core/crypto';
import { gradeAttempt } from '../server/core/grade';
import { ApiError, assertSameOrigin, clientIp, defineRoute, isPlainObject, jsonResponse, logEvent, readJsonBody, requireMethod } from '../server/core/http';
import { enforceRateLimit } from '../server/core/ratelimit';
import { SUBMIT_GRACE_SEC, signToken, verifyToken, type AttemptTokenPayload, type ResultTokenPayload } from '../server/core/tokens';

const REASONS: SubmitReason[] = ['submitted', 'timeout', 'violations', 'abandoned'];

export default defineRoute(async (req) => {
  const { cfg, registry } = context();
  requireMethod(req, 'POST');
  assertSameOrigin(req, cfg);
  requireGrading(cfg);

  enforceRateLimit(`grade:${clientIp(req)}`, cfg.limits.gradeAttempt, cfg.limits.windowMs);

  const body = await readJsonBody<SubmitAttemptRequest>(req);
  if (!isPlainObject(body)) throw new ApiError('bad_request', 'Expected a JSON object.');

  const token = typeof body.attemptToken === 'string' ? body.attemptToken : '';
  if (!token) throw new ApiError('invalid_attempt', 'attemptToken is required.');

  const verified = verifyToken<AttemptTokenPayload>(cfg.signingSecret!, token, 'attempt');
  if (!verified.ok) {
    if (verified.reason === 'expired') throw new ApiError('attempt_expired', 'This attempt has expired.');
    throw new ApiError('invalid_attempt', 'This attempt token is not valid.');
  }
  const attempt = verified.payload;

  // Small grace window so a submission racing the deadline is not lost.
  if (Date.now() > attempt.e + SUBMIT_GRACE_SEC * 1000) {
    throw new ApiError('attempt_expired', 'This attempt has expired.');
  }

  const reason: SubmitReason = REASONS.includes(body.reason as SubmitReason) ? (body.reason as SubmitReason) : 'submitted';
  const answers = Array.isArray(body.answers) ? body.answers : null;
  if (!answers) throw new ApiError('bad_request', 'answers must be an array aligned with the issued questions.');

  const topic = loadTopic(cfg, attempt.t);
  assertDeployableKey(cfg, topic);
  if (attempt.bv !== topic.version) {
    throw new ApiError('invalid_attempt', 'This attempt was issued against a different version of the question bank.');
  }

  const graded = gradeAttempt({
    cfg,
    topic,
    attempt,
    answers: answers.map((a) => (a === null || a === undefined ? null : Number(a))),
    reason,
    selfReportedViolations: typeof body.violations === 'number' ? body.violations : 0,
  });

  const level = LEVELS[attempt.l as LevelId];

  // ── Result token: the ONLY thing that can later authorise issuance ──
  const passed = graded.passed;
  const resultPayload: ResultTokenPayload = {
    v: 1,
    p: 'result',
    t: attempt.t,
    l: attempt.l,
    b: attempt.b,
    bv: attempt.bv,
    n: attempt.n,
    ab: sha256Hex(token).slice(0, 32),
    q: attempt.q,
    r: attempt.r,
    lr: attempt.lr,
    s: graded.score,
    c: graded.correctCount,
    x: graded.totalCount,
    ok: graded.passed,
    rs: reason,
    sv: graded.integrity.selfReportedViolations,
    i: Date.now(),
    e: Date.now() + 15 * 60 * 1000,
  };

  const retakeHours = graded.passed ? level.retakeAfterPassHours : level.retakeAfterFailHours;
  // Null means "no retake is available"; a level that allows one immediately
  // (0 hours) is a real policy, so the check is on the hours, not on `passed`.
  const nextAvailableAt = retakeHours > 0 ? new Date(Date.now() + retakeHours * 3600 * 1000).toISOString() : null;

  const result: AttemptResult = {
    schema: 'rfv.result/1',
    resultToken: signToken(cfg.signingSecret!, resultPayload),
    topicId: attempt.t,
    level: attempt.l as LevelId,
    topicTitle: topic.title,
    score: graded.score,
    correctCount: graded.correctCount,
    totalCount: graded.totalCount,
    passed: graded.passed,
    passingScore: level.passingScore,
    durationUsedSec: graded.durationUsedSec,
    submittedAt: new Date(resultPayload.i).toISOString(),
    reason,
    integrity: {
      selfReportedViolations: graded.integrity.selfReportedViolations,
      reviewDisclosure: graded.reviewDisclosure,
    },
    breakdown: graded.breakdown,
    strengths: graded.strengths,
    needsWork: graded.needsWork,
    review: graded.review,
    recommendations: graded.recommendations,
    retake: {
      eligible: retakeHours > 0,
      nextAvailableAt,
      policy: retakeHours > 0
        ? `A retake is allowed ${retakeHours} hours after ${graded.passed ? 'a pass' : 'a failed attempt'}.`
        : 'No retake is offered for this level.',
    },
    credentialEligible: graded.passed && reason !== 'abandoned',
  };

  // Best-effort attempt history (pseudonymous: HMAC ref + topic/level/score,
  // no names or emails) so retake cooldowns work across devices. A failure here
  // never blocks the learner — grading is already complete and authoritative.
  void registry
    .appendLearnerRecord(attempt.lr, {
      attempt: { topic: attempt.t, level: attempt.l, at: result.submittedAt, score: graded.score, passed },
    })
    .catch(() => false);

  logEvent('attempt_graded', {
    topic: attempt.t,
    level: attempt.l,
    score: graded.score,
    passed: graded.passed,
    reason,
    answered: graded.answeredCount,
    items: graded.totalCount,
  });

  return jsonResponse(result);
});
