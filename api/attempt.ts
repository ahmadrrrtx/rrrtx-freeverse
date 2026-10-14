// ────────────────────────────────────────────────────────────
// POST /api/attempt — start a server-authoritative assessment attempt
//
// The server selects the items (blueprint + random draw), mints a
// signed attempt token and returns prompts + options ONLY. Answer
// keys, grading rules and signing material never leave the server.
// ────────────────────────────────────────────────────────────

import type { StartAttemptRequest, StartAttemptResponse } from '../shared/contracts';
import { CREDENTIAL_DISCLOSURE, LEVELS, isLevelId } from '../shared/levels';
import { assertDeployableKey, loadTopic, manifestTopic, selectItems } from '../server/core/bank';
import { context, requireGrading } from '../server/core/context';
import { learnerRefFromEmail, recipientRef } from '../server/core/crypto';
import { ApiError, assertSameOrigin, clientIp, defineRoute, isPlainObject, jsonResponse, logEvent, readJsonBody, requireMethod, sanitizeEmail, sanitizeText } from '../server/core/http';
import { enforceRateLimit } from '../server/core/ratelimit';
import { newNonce, signToken, type AttemptTokenPayload } from '../server/core/tokens';

export default defineRoute(async (req) => {
  const { cfg, registry } = context();
  requireMethod(req, 'POST');
  assertSameOrigin(req, cfg);
  requireGrading(cfg);

  enforceRateLimit(`attempt:${clientIp(req)}`, cfg.limits.startAttempt, cfg.limits.windowMs);

  const body = await readJsonBody<StartAttemptRequest>(req);
  if (!isPlainObject(body)) throw new ApiError('bad_request', 'Expected a JSON object.');

  const topicId = sanitizeText(body.topicId, { min: 1, max: 64, field: 'topicId' }).toLowerCase();
  if (!isLevelId(body.level)) throw new ApiError('bad_request', 'level must be foundation, intermediate or advanced.');
  const levelId = body.level;
  const level = LEVELS[levelId];

  if (!isPlainObject(body.recipient)) throw new ApiError('bad_request', 'recipient is required.');
  const displayName = sanitizeText((body.recipient as Record<string, unknown>).displayName, { min: 2, max: 64, field: 'display name' });
  const email = sanitizeEmail((body.recipient as Record<string, unknown>).email);

  const topicManifest = manifestTopic(topicId);
  if (!topicManifest) throw new ApiError('bad_request', 'Unknown topic.');

  const levelInfo = topicManifest.levels?.[levelId];
  if (!levelInfo?.available) {
    throw new ApiError('conflict', levelInfo?.reason ?? 'This assessment level is not available for this topic yet.');
  }
  if (cfg.requireVerifiedBank && topicManifest.quality.assessmentIntegrity !== 'verified') {
    throw new ApiError(
      'engine_unavailable',
      'This topic is paused: its item bank has not yet passed the automated quality gate (FREEVERSE_REQUIRE_VERIFIED_BANK=1).',
    );
  }

  const topic = loadTopic(cfg, topicId);
  assertDeployableKey(cfg, topic);

  // ── Identity binding ──
  // The attempt is bound to (display name, email) so a passing result cannot be
  // handed to a different person at issuance time.
  const recipient = recipientRef(cfg.signingSecret!, displayName, email);
  const learnerRef = learnerRefFromEmail(cfg.signingSecret!, email);

  // ── Eligibility: prerequisites + retake cooldown ──
  // Backed by a pseudonymous registry record (no names, no emails). If the
  // registry cannot be read we allow the attempt and record that the
  // prerequisite was unverified — a false block would lock out real learners,
  // and the credential itself does not depend on this check.
  let prerequisitesVerified = true;
  let learnerHistory: Awaited<ReturnType<typeof registry.readLearner>> = null;
  try {
    learnerHistory = await registry.readLearner(learnerRef);
  } catch (e) {
    prerequisitesVerified = false;
    logEvent('eligibility_lookup_failed', { topic: topicId, level: levelId, name: e instanceof Error ? e.name : 'unknown' });
  }

  if (level.requiresLevel) {
    let satisfied = false;
    if (learnerHistory?.credentials?.some((c) => c.topic === topicId && c.level === level.requiresLevel && c.status === 'valid')) {
      satisfied = true;
    }

    // Explicit proof path: the learner supplies a prior credential id.
    if (!satisfied && typeof body.prerequisiteCredentialId === 'string' && body.prerequisiteCredentialId.trim()) {
      const claimedId = sanitizeText(body.prerequisiteCredentialId, { min: 8, max: 32, field: 'prerequisiteCredentialId' }).toUpperCase();
      if (!/^RFV-\d{4}-[A-F0-9]{8}$/.test(claimedId)) throw new ApiError('bad_request', 'That credential id is not in the expected format.');
      const found = await registry.readCredential(claimedId);
      const record = found?.record as
        | { subject?: { learner_ref?: string }; credential?: { topic_id?: string; level?: string }; status?: string }
        | undefined;
      const revocations = await registry.readRevocations();
      const revoked = revocations.revoked.some((r) => r.id === claimedId);
      if (
        record &&
        !revoked &&
        record.subject?.learner_ref === learnerRef &&
        record.credential?.topic_id === topicId &&
        record.credential?.level === level.requiresLevel
      ) {
        satisfied = true;
      }
    }

    if (!satisfied) {
      if (!prerequisitesVerified) {
        logEvent('prerequisite_unverified', { topic: topicId, level: levelId });
      } else {
        throw new ApiError(
          'prerequisite_missing',
          `This level requires a valid ${LEVELS[level.requiresLevel].label} credential in ${topicManifest.title}. Take that assessment first, or provide its credential id.`,
        );
      }
    }
  }

  // Retake cooldown (self-consistent, advisory only when the history is unreadable).
  const recent = (learnerHistory?.attempts ?? []).filter((a) => a.topic === topicId && a.level === levelId);
  const last = recent[recent.length - 1];
  if (last) {
    const hours = last.passed ? level.retakeAfterPassHours : level.retakeAfterFailHours;
    const availableAt = new Date(new Date(last.at).getTime() + hours * 3600 * 1000);
    if (Number.isFinite(availableAt.getTime()) && availableAt.getTime() > Date.now()) {
      throw new ApiError('cooldown_active', `Retake rules for this level allow another attempt from ${availableAt.toISOString()}.`, {
        details: { nextAvailableAt: availableAt.toISOString(), policy: last.passed ? `after a pass: ${hours}h` : `after a fail: ${hours}h` },
        headers: { 'Retry-After': String(Math.max(1, Math.ceil((availableAt.getTime() - Date.now()) / 1000))) },
      });
    }
  }

  // ── Build the attempt ──
  const nonce = newNonce();
  const selection = selectItems(cfg, topic, levelId, nonce);
  const issuedAt = Date.now();
  const expiresAt = issuedAt + level.durationSec * 1000;

  const payload: AttemptTokenPayload = {
    v: 1,
    p: 'attempt',
    t: topicId,
    l: levelId,
    b: selection.blueprintId,
    bv: topic.version,
    q: selection.items.map((i) => i.item.ref),
    r: recipient,
    lr: learnerRef,
    i: issuedAt,
    e: expiresAt,
    n: nonce,
  };

  if (selection.coverageGaps.length) {
    logEvent('coverage_gaps', { topic: topicId, level: levelId, gaps: selection.coverageGaps.length });
  }

  const response: StartAttemptResponse & { integrityNote: string } = {
    attemptToken: signToken(cfg.signingSecret!, payload),
    attemptId: nonce,
    topicId,
    topicTitle: topicManifest.title,
    level: levelId,
    expiresAt: new Date(expiresAt).toISOString(),
    durationSec: level.durationSec,
    passingScore: level.passingScore,
    questions: selection.items.map(({ item }) => ({
      ref: item.ref,
      prompt: item.prompt,
      options: undefined as unknown as string[],
      skillId: item.skillId,
      skillName: item.skillName,
      // options filled below (keeps the mapper readable)
    })).map((q, index) => ({ ...q, options: selection.items[index]!.shuffledOptions })),
    disclosure: {
      method: CREDENTIAL_DISCLOSURE.method,
      identity: CREDENTIAL_DISCLOSURE.identity,
      integrity: CREDENTIAL_DISCLOSURE.integrity,
    },
    // Transparency about the bank's measured weakness, not a marketing claim.
    integrityNote:
      topicManifest.quality.assessmentIntegrity === 'verified'
        ? 'Item bank passed the automated quality gate for this topic.'
        : `Item bank quality is under review for this topic: ${(topicManifest.quality.servableBaseline * 100).toFixed(0)}% of available items can be answered correctly by a "pick the longest option" strategy. Results are graded server-side, but treat this credential as provisional.`,
  };

  logEvent('attempt_started', { topic: topicId, level: levelId, items: response.questions.length, baseline: selection.baselineLongest });

  return jsonResponse(response);
});
