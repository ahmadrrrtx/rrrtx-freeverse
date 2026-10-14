// ────────────────────────────────────────────────────────────
// End-to-end assessment lifecycle regression tests.
//
// These are the tests that back the claims in SECURITY_AUDIT.md.
// Each one names the vulnerability class it locks down.
// ────────────────────────────────────────────────────────────

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import startAttempt from '../api/attempt';
import gradeAttemptRoute from '../api/grade';
import rerereadResult from '../api/result';
import issueCredentialRoute from '../api/credential';
import verifyRoute from '../api/verify';
import legacyIssueRoute from '../api/issue-cert';
import type { IssueCredentialResponse, StartAttemptResponse, AttemptResult, VerifyResponse } from '../shared/contracts';
import { resetRateLimits } from '../server/core/ratelimit';
import { signToken, type AttemptTokenPayload } from '../server/core/tokens';
import { ed25519SeedBase64, FakeRegistry, installContext, jsonRequest, randomEmail, TEST_SIGNING_SECRET, testConfig, clearContext } from './helpers';

const TOPIC = 'python-fundamentals';
const RECIPIENT = { displayName: 'Ada Lovelace', email: 'ada@example.test' };

async function call<T>(handler: (req: Request) => Promise<Response>, req: Request): Promise<{ status: number; body: T }> {
  const res = await handler(req);
  const body = (await res.json()) as T;
  return { status: res.status, body };
}

function setup(overrides = {}) {
  const cfg = testConfig({ issuerSeed: ed25519SeedBase64(), ghToken: 'test-token-not-real', ...overrides });
  const registry = new FakeRegistry(cfg);
  installContext(cfg, registry);
  return { cfg, registry };
}

async function start(overrides: Partial<{ level: string; recipient: typeof RECIPIENT; topicId: string }> = {}) {
  return call<StartAttemptResponse & { error?: { code: string; message: string } }>(
    startAttempt as never,
    jsonRequest('https://app.test/api/attempt', {
      topicId: overrides.topicId ?? TOPIC,
      level: overrides.level ?? 'foundation',
      recipient: overrides.recipient ?? RECIPIENT,
    }),
  );
}

/** Answer every question correctly by reading the sealed bank (server-side test only). */
async function correctAnswersFor(studentToken: string) {
  const { loadTopic, optionPermutation } = await import('../server/core/bank');
  const { context } = await import('../server/core/context');
  const { cfg } = context();
  const { verifyToken } = await import('../server/core/tokens');
  const payload = verifyToken<AttemptTokenPayload>(TEST_SIGNING_SECRET, studentToken, 'attempt');
  if (!payload.ok) throw new Error('bad token');
  const topic = loadTopic(cfg, payload.payload.t);
  return payload.payload.q.map((ref) => {
    const item = topic.refIndex.get(ref)!;
    const permutation = optionPermutation(cfg, payload.payload.n, ref, item.options.length);
    return permutation.indexOf(item.answerIndex);
  });
}

beforeEach(() => {
  resetRateLimits();
});

afterEach(() => {
  clearContext();
});

describe('assessment lifecycle', () => {
  it('serves questions without answer keys (P1-A)', async () => {
    setup();
    const { status, body } = await start();
    expect(status).toBe(200);
    expect(body.questions.length).toBeGreaterThanOrEqual(10);

    // Nothing answer-revealing may appear anywhere in the response payload.
    const forbiddenKeys = ['answer', 'answerIndex', 'answer_commit', 'correctOption', 'correctOptionIndex', 'explanation', 'explanation_enc'];
    const seenKeys = new Set<string>();
    const walk = (value: unknown): void => {
      if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === 'object') {
        for (const [k, v] of Object.entries(value)) {
          seenKeys.add(k);
          walk(v);
        }
      }
    };
    walk(body);
    for (const forbidden of forbiddenKeys) expect(seenKeys.has(forbidden)).toBe(false);
    expect(JSON.stringify(body)).not.toMatch(/explanation_enc|answer_commit/);
    for (const q of body.questions) {
      expect(q.options).toHaveLength(4);
      expect(q).not.toHaveProperty('answerIndex');
      expect(q).not.toHaveProperty('correctOptionIndex');
      // Opaque item refs, not bank question ids (ids are stable in git history).
      expect(q.ref).toMatch(/^[A-Za-z0-9_-]{16,32}$/);
    }
    expect(body.attemptToken).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  });

  it('grades server-side and rejects a forged score (P0-C)', async () => {
    setup();
    const started = await start();
    // A client cannot submit a score at all — only option positions. Any extra
    // fields are ignored, so a forged `score`/`passed` must have no effect.
    const tricky = await call<AttemptResult & { error?: { code: string } }>(
      gradeAttemptRoute as never,
      jsonRequest('https://app.test/api/grade', {
        attemptToken: started.body.attemptToken,
        answers: started.body.questions.map(() => 0),
        reason: 'submitted',
        score: 100,
        passed: true,
        violations: 0,
      }),
    );
    expect(tricky.body.score).toBeLessThan(100);
    expect(tricky.body.passed).toBe(false);
  });

  it('rejects a tampered attempt token (P0-C)', async () => {
    setup();
    const started = await start();
    const [payloadB64] = started.body.attemptToken.split('.');
    const forged = Buffer.from(
      JSON.stringify({ ...JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')), e: Date.now() + 10 ** 9 }),
    ).toString('base64url');

    const res = await call<{ error: { code: string } }>(
      gradeAttemptRoute as never,
      jsonRequest('https://app.test/api/grade', {
        attemptToken: `${forged}.${started.body.attemptToken.split('.')[1]}`,
        answers: [],
        reason: 'submitted',
      }),
    );
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('invalid_attempt');
  });

  it('rejects out-of-range answers and mismatched answer sheets (P1-C)', async () => {
    setup();
    const started = await start();
    const base = {
      attemptToken: started.body.attemptToken,
      reason: 'submitted',
    };

    const tooShort = await call<{ error: { code: string } }>(
      gradeAttemptRoute as never,
      jsonRequest('https://app.test/api/grade', { ...base, answers: [0, 1] }),
    );
    expect(tooShort.status).toBe(400);

    const outOfRange = await call<{ error: { code: string } }>(
      gradeAttemptRoute as never,
      jsonRequest('https://app.test/api/grade', {
        ...base,
        answers: started.body.questions.map(() => 99),
      }),
    );
    expect(outOfRange.status).toBe(400);
    expect(outOfRange.body.error.code).toBe('bad_request');
  });

  it('does not pass an attempt terminated by violations or abandonment (P1-D)', async () => {
    setup();
    for (const reason of ['violations', 'abandoned'] as const) {
      // Distinct learner per iteration: retake cooldown is enforced through the
      // pseudonymous history record, and this test is not about cooldowns.
      const started = await start({ recipient: { displayName: 'Ada Lovelace', email: randomEmail() } });
      const answers = await correctAnswersFor(started.body.attemptToken);
      const graded = await call<AttemptResult>(gradeAttemptRoute as never, jsonRequest('https://app.test/api/grade', {
        attemptToken: started.body.attemptToken,
        answers,
        reason,
        violations: reason === 'violations' ? 3 : 0,
      }));
      expect(graded.body.score).toBe(100); // knowledge is scored…
      expect(graded.body.passed).toBe(false); // …but the attempt cannot pass
      expect(graded.body.credentialEligible).toBe(false);
    }
  });

  it('withholds item answers when too few questions were answered (harvesting control)', async () => {
    setup();
    const started = await start();
    const answers = started.body.questions.map((_, i) => (i < 3 ? 0 : null));
    const graded = await call<AttemptResult>(gradeAttemptRoute as never, jsonRequest('https://app.test/api/grade', {
      attemptToken: started.body.attemptToken,
      answers,
      reason: 'submitted',
    }));
    expect(graded.body.integrity.reviewDisclosure).toBe('aggregate-only');
    for (const entry of graded.body.review) {
      expect(entry.correctOption).toBeNull();
      expect(entry.explanation).toBeNull();
    }
  });

  it('never discloses answers for skipped items even in a normal attempt', async () => {
    setup();
    const started = await start();
    const answers = started.body.questions.map((_, i) => (i === 0 ? 0 : i === 1 ? null : 1));
    const graded = await call<AttemptResult>(gradeAttemptRoute as never, jsonRequest('https://app.test/api/grade', {
      attemptToken: started.body.attemptToken,
      answers,
      reason: 'submitted',
    }));
    const skipped = graded.body.review.find((r) => r.chosenOption === null);
    expect(skipped?.correctOption ?? null).toBeNull();
    expect(skipped?.explanation ?? null).toBeNull();
  });

  it('expires attempts (attempt state transition)', async () => {
    const { cfg } = setup();
    const payload: AttemptTokenPayload = {
      v: 1,
      p: 'attempt',
      t: TOPIC,
      l: 'foundation',
      b: 'rfv.blueprint.test',
      bv: '2.0.0',
      q: [],
      r: 'recipient',
      lr: 'learner',
      i: Date.now() - 3600_000,
      e: Date.now() - 120_000,
      n: 'nonce',
    };
    const expired = signToken(cfg.signingSecret!, payload);
    const res = await call<{ error: { code: string } }>(
      gradeAttemptRoute as never,
      jsonRequest('https://app.test/api/grade', { attemptToken: expired, answers: [], reason: 'submitted' }),
    );
    expect(res.status).toBe(410);
    expect(res.body.error.code).toBe('attempt_expired');
  });

  it('refuses an attempt token presented as a result token (purpose confusion)', async () => {
    const { cfg } = setup();
    const attemptToken = signToken(cfg.signingSecret!, {
      v: 1, p: 'attempt', t: TOPIC, l: 'foundation', b: 'b', bv: '2.0.0', q: [], r: 'r', lr: 'l', i: Date.now(), e: Date.now() + 1000, n: 'n',
    });
    const res = await call<{ error: { code: string } }>(
      issueCredentialRoute as never,
      jsonRequest('https://app.test/api/credential', { resultToken: attemptToken, recipient: RECIPIENT }),
    );
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('invalid_result');
  });
});

describe('credential issuance', () => {
  async function passingAttempt() {
    const started = await start();
    const answers = await correctAnswersFor(started.body.attemptToken);
    const graded = await call<AttemptResult>(gradeAttemptRoute as never, jsonRequest('https://app.test/api/grade', {
      attemptToken: started.body.attemptToken,
      answers,
      reason: 'submitted',
    }));
    return { started, graded };
  }

  it('issues exactly one signed credential for a passing attempt', async () => {
    const { registry } = setup();
    const { graded } = await passingAttempt();
    expect(graded.body.passed).toBe(true);

    const issued = await call<IssueCredentialResponse>(issueCredentialRoute as never, jsonRequest('https://app.test/api/credential', {
      resultToken: graded.body.resultToken,
      recipient: RECIPIENT,
    }));
    expect(issued.status).toBe(201);
    expect(issued.body.credential.id).toMatch(/^RFV-\d{4}-[A-F0-9]{8}$/);
    expect(issued.body.credential.provenance).toBe('signed');
    expect(issued.body.credential.signature?.alg).toBe('Ed25519');
    expect(issued.body.alreadyIssued).toBe(false);
    expect(registry.writes.filter((p) => p.startsWith('certs/'))).toHaveLength(1);
  });

  it('is idempotent: a replayed request returns the same credential, never a second one', async () => {
    const { registry } = setup();
    const { graded } = await passingAttempt();
    const first = await call<IssueCredentialResponse>(issueCredentialRoute as never, jsonRequest('https://app.test/api/credential', {
      resultToken: graded.body.resultToken,
      recipient: RECIPIENT,
    }));
    const second = await call<IssueCredentialResponse>(issueCredentialRoute as never, jsonRequest('https://app.test/api/credential', {
      resultToken: graded.body.resultToken,
      recipient: RECIPIENT,
    }));
    expect(second.body.credential.id).toBe(first.body.credential.id);
    expect(second.body.alreadyIssued).toBe(true);
    expect(registry.writes.filter((p) => p.startsWith('certs/'))).toHaveLength(1);
  });

  it('refuses issuance for a failed attempt (P0-A)', async () => {
    setup();
    const started = await start();
    const graded = await call<AttemptResult>(gradeAttemptRoute as never, jsonRequest('https://app.test/api/grade', {
      attemptToken: started.body.attemptToken,
      answers: started.body.questions.map(() => 3),
      reason: 'submitted',
    }));
    const res = await call<{ error: { code: string } }>(
      issueCredentialRoute as never,
      jsonRequest('https://app.test/api/credential', { resultToken: graded.body.resultToken, recipient: RECIPIENT }),
    );
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('not_passed');
  });

  it('refuses issuance without any result token (direct call bypass)', async () => {
    setup();
    const res = await call<{ error: { code: string } }>(
      issueCredentialRoute as never,
      jsonRequest('https://app.test/api/credential', { recipient: RECIPIENT }),
    );
    expect(res.status).toBe(400);
  });

  it('refuses issuance for a hand-crafted "passing" result token (unsignable without the secret)', async () => {
    const { cfg } = setup();
    const forged = signToken('attacker-guess', {
      v: 1, p: 'result', t: TOPIC, l: 'foundation', b: 'b', bv: '2.0.0', n: 'n', ab: 'x', q: [], r: 'r', lr: 'l',
      s: 100, c: 20, x: 20, ok: true, rs: 'submitted', sv: 0, i: Date.now(), e: Date.now() + 1000,
    });
    const res = await call<{ error: { code: string } }>(
      issueCredentialRoute as never,
      jsonRequest('https://app.test/api/credential', { resultToken: forged, recipient: RECIPIENT }),
    );
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('invalid_result');
    void cfg;
  });

  it('binds the credential to the identity that took the attempt (transfer attempt rejected)', async () => {
    setup();
    const { graded } = await passingAttempt();
    const res = await call<{ error: { code: string; message: string } }>(
      issueCredentialRoute as never,
      jsonRequest('https://app.test/api/credential', {
        resultToken: graded.body.resultToken,
        recipient: { displayName: 'Someone Else', email: 'other@example.test' },
      }),
    );
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('invalid_result');
  });

  it('does not claim success when the registry write fails (P0-D)', async () => {
    const { registry } = setup();
    const { graded } = await passingAttempt();
    registry.writeFailure = 'upstream';
    const res = await call<{ error: { code: string; retryable: boolean } }>(
      issueCredentialRoute as never,
      jsonRequest('https://app.test/api/credential', { resultToken: graded.body.resultToken, recipient: RECIPIENT }),
    );
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('registry_unavailable');
    // No credential file was created. (The learner-history file may exist: it is
    // written during grading, before issuance is attempted, and carries no PII.)
    expect([...registry.files.keys()].filter((p) => p.startsWith('certs/'))).toHaveLength(0);
  });

  it('keeps the legacy /api/issue-cert endpoint closed (P0-B regression)', async () => {
    setup();
    const res = await call<{ error: { code: string } }>(
      legacyIssueRoute as never,
      jsonRequest('https://app.test/api/issue-cert', {
        id: 'RFV-2026-DEADBEEF',
        recipient: { name: 'Forged Person', email_hash: 'sha256:forged' },
        quiz: { id: 'python-fundamentals', title: 'Python Fundamentals', version: '1.0' },
        score: 100,
        issued_at: new Date().toISOString(),
        issuer: 'RRRTX FreeVerse',
        verify_url: 'https://rrrtx-freeverse.vercel.app/verify?id=RFV-2026-DEADBEEF',
      }),
    );
    expect(res.status).toBe(410);
    expect(res.body.error.code).toBe('not_implemented');
  });
});

describe('verification', () => {
  async function issueOne() {
    const started = await start();
    const answers = await correctAnswersFor(started.body.attemptToken);
    const graded = await call<AttemptResult>(gradeAttemptRoute as never, jsonRequest('https://app.test/api/grade', {
      attemptToken: started.body.attemptToken,
      answers,
      reason: 'submitted',
    }));
    const issued = await call<IssueCredentialResponse>(issueCredentialRoute as never, jsonRequest('https://app.test/api/credential', {
      resultToken: graded.body.resultToken,
      recipient: RECIPIENT,
    }));
    return issued.body.credential.id;
  }

  it('reports a signed credential as valid', async () => {
    setup();
    const id = await issueOne();
    const res = await call<VerifyResponse>(verifyRoute as never, new Request(`https://app.test/api/verify?id=${id}`));
    expect(res.body.state).toBe('valid');
    expect(res.body.credential?.provenance).toBe('signed');
    expect(res.body.credential?.subject.displayName).toBe(RECIPIENT.displayName);
  });

  it('reports a revoked credential as revoked, not valid', async () => {
    const { registry } = setup();
    const id = await issueOne();
    registry.revokedIds = [{ id, revoked_at: new Date().toISOString(), reason: 'issued_in_error' }];
    const res = await call<VerifyResponse>(verifyRoute as never, new Request(`https://app.test/api/verify?id=${id}`));
    expect(res.body.state).toBe('revoked');
    expect(res.body.credential?.revocation?.reason).toBe('issued_in_error');
  });

  it('reports an unknown but well-formed id as not-found', async () => {
    setup();
    const res = await call<VerifyResponse>(verifyRoute as never, new Request('https://app.test/api/verify?id=RFV-2026-AAAAAAAA'));
    expect(res.body.state).toBe('not-found');
    expect(res.body.credential).toBeNull();
  });

  it('reports a malformed id as invalid-id', async () => {
    setup();
    const res = await call<VerifyResponse>(verifyRoute as never, new Request('https://app.test/api/verify?id=RFV-2026-XYZ'));
    expect(res.body.state).toBe('invalid-id');
  });

  it('never reports a registry outage as valid', async () => {
    const { registry } = setup();
    const id = await issueOne();
    const { ApiError } = await import('../server/core/http');
    registry.readCredential = async () => {
      throw new ApiError('registry_unavailable', 'simulated outage');
    };
    const res = await call<VerifyResponse>(verifyRoute as never, new Request(`https://app.test/api/verify?id=${id}`));
    expect(res.body.state).toBe('registry-unavailable');
    expect(res.body.credential).toBeNull();
  });

  it('flags a registry record whose signature does not verify', async () => {
    const { registry } = setup();
    const id = await issueOne();
    // Simulate a registry write from someone who can commit but cannot sign.
    for (const [path, raw] of [...registry.files.entries()]) {
      if (path.endsWith(`${id}.json`)) {
        const record = JSON.parse(raw) as { assessment: { score: number }; signature: { value: string } };
        record.assessment.score = 100;
        record.signature.value = 'AAAA';
        registry.files.set(path, JSON.stringify(record));
      }
    }
    const res = await call<VerifyResponse>(verifyRoute as never, new Request(`https://app.test/api/verify?id=${id}`));
    expect(res.body.state).toBe('unauthenticated-record');
  });

  it('keeps legacy unsigned records verifiable but clearly labelled', async () => {
    const { registry } = setup();
    const legacyId = 'RFV-2026-3BB2D4D5';
    registry.files.set(
      `certs/2026/05/${legacyId}.json`,
      JSON.stringify({
        id: legacyId,
        recipient: { name: 'Legacy Learner', email_hash: 'sha256:legacy' },
        quiz: { id: 'no-code-automation', title: 'No-Code & Automation', version: '1.0' },
        score: 100,
        issued_at: '2026-05-28T21:17:13.029Z',
        issuer: 'RRRTX FreeVerse',
        verify_url: 'https://rrrtx-freeverse.vercel.app/verify?id=' + legacyId,
        integrity: { violations: 0, completed_in_secure_mode: true },
      }),
    );
    const res = await call<VerifyResponse>(verifyRoute as never, new Request(`https://app.test/api/verify?id=${legacyId}`));
    expect(res.body.state).toBe('valid');
    expect(res.body.credential?.provenance).toBe('legacy-unsigned');
    expect(res.body.notes.join(' ')).toMatch(/cannot be cryptographically verified/i);

    // The pre-2.0 record shape must map onto the public view instead of
    // degrading to "Unknown": the three credentials already in the registry
    // depend on this.
    expect(res.body.credential?.subject.displayName).toBe('Legacy Learner');
    expect(res.body.credential?.credential.title).toBe('No-Code & Automation');
    expect(res.body.credential?.assessment.score).toBe(100);
    expect(res.body.credential?.credential.levelLabel).toMatch(/legacy/i);

    // …and the legacy email hash must NOT be republished by the API.
    const serialised = JSON.stringify(res.body);
    expect(serialised).not.toContain('email_hash');
    expect(serialised).not.toContain('sha256:legacy');
  });
});

describe('result re-read', () => {
  it('re-derives the score from the signed token (refresh cannot change the result)', async () => {
    setup();
    const started = await start();
    const answers = await correctAnswersFor(started.body.attemptToken);
    const graded = await call<AttemptResult>(gradeAttemptRoute as never, jsonRequest('https://app.test/api/grade', {
      attemptToken: started.body.attemptToken,
      answers,
      reason: 'submitted',
    }));
    const reread = await call<AttemptResult>(rerereadResult as never, jsonRequest('https://app.test/api/result', {
      resultToken: graded.body.resultToken,
    }));
    expect(reread.body.score).toBe(graded.body.score);
    expect(reread.body.passed).toBe(graded.body.passed);

    const tampered = await call<{ error: { code: string } }>(
      rerereadResult as never,
      jsonRequest('https://app.test/api/result', { resultToken: `${graded.body.resultToken.slice(0, -2)}xx` }),
    );
    expect(tampered.status).toBe(400);
  });
});

describe('abuse controls', () => {
  it('rate limits attempt creation per client', async () => {
    const cfg = testConfig({ issuerSeed: ed25519SeedBase64(), ghToken: 't', limits: { ...testConfig().limits, startAttempt: 3 } });
    const registry = new FakeRegistry(cfg);
    installContext(cfg, registry);
    resetRateLimits();

    const results: number[] = [];
    for (let i = 0; i < 5; i += 1) {
      const res = await call(startAttempt as never, jsonRequest('https://app.test/api/attempt', {
        topicId: TOPIC,
        level: 'foundation',
        recipient: { displayName: 'Rate Test', email: randomEmail() },
      }));
      results.push(res.status);
    }
    expect(results.filter((s) => s === 200).length).toBe(3);
    expect(results[results.length - 1]).toBe(429);
  });

  it('rejects cross-site state-changing requests', async () => {
    setup();
    const req = new Request('https://app.test/api/attempt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example', 'Sec-Fetch-Site': 'cross-site' },
      body: JSON.stringify({ topicId: TOPIC, level: 'foundation', recipient: RECIPIENT }),
    });
    const res = await call<{ error: { code: string } }>(startAttempt as never, req);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('origin_rejected');
  });

  it('validates recipient input', async () => {
    setup();
    const bad = await call<{ error: { code: string } }>(
      startAttempt as never,
      jsonRequest('https://app.test/api/attempt', { topicId: TOPIC, level: 'foundation', recipient: { displayName: 'A', email: 'not-an-email' } }),
    );
    expect(bad.status).toBe(400);
    const longName = await call<{ error: { code: string } }>(
      startAttempt as never,
      jsonRequest('https://app.test/api/attempt', {
        topicId: TOPIC,
        level: 'foundation',
        recipient: { displayName: 'x'.repeat(300), email: 'ok@example.test' },
      }),
    );
    expect(longName.status).toBe(400);
  });

  it('enforces the retake cooldown through the pseudonymous history record', async () => {
    setup();
    const email = randomEmail();
    const first = await start({ recipient: { displayName: 'Cooldown Tester', email } });
    expect(first.status).toBe(200);
    await call(gradeAttemptRoute as never, jsonRequest('https://app.test/api/grade', {
      attemptToken: first.body.attemptToken,
      answers: first.body.questions.map(() => 0),
      reason: 'submitted',
    }));

    const second = await call<{ error: { code: string; details?: { nextAvailableAt?: string } } }>(
      startAttempt as never,
      jsonRequest('https://app.test/api/attempt', {
        topicId: TOPIC,
        level: 'foundation',
        recipient: { displayName: 'Cooldown Tester', email },
      }),
    );
    expect(second.status).toBe(429);
    expect(second.body.error.code).toBe('cooldown_active');
    expect(second.body.error.details?.nextAvailableAt).toBeTruthy();
  });

  it('requires the prior level before an intermediate attempt', async () => {
    setup();
    const res = await call<{ error: { code: string } }>(
      startAttempt as never,
      jsonRequest('https://app.test/api/attempt', {
        topicId: TOPIC,
        level: 'intermediate',
        recipient: { displayName: 'Prereq Tester', email: randomEmail() },
      }),
    );
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('prerequisite_missing');
  });

  it('refuses an unavailable level with a clear reason instead of degrading silently', async () => {
    setup();
    const res = await call<{ error: { code: string; message: string } }>(
      startAttempt as never,
      jsonRequest('https://app.test/api/attempt', { topicId: 'cloud-basics', level: 'advanced', recipient: RECIPIENT }),
    );
    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/review/i);
  });
});
