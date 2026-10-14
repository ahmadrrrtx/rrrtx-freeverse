// ────────────────────────────────────────────────────────────
// RRRTX FreeVerse — signed, stateless attempt/result tokens
//
// WHY STATELESS
//   The product has no database by design (zero-cost architecture).
//   Instead of trusting the browser, every lifecycle fact the
//   server needs later is minted by the server, signed with
//   HMAC-SHA256, and handed back to the browser as an opaque token.
//   The browser can read it, but it cannot mint one, change one, or
//   replay one outside its window.
//
// WHAT THIS DOES AND DOES NOT GIVE US
//   + The server owns question selection, grading, pass/fail and
//     credential eligibility. Client-submitted scores are ignored.
//   + Tokens expire; a result token cannot be minted without a
//     passing grade; credential ids derive from the attempt nonce,
//     so replaying an issuance request cannot create a second
//     credential.
//   - Without shared storage we cannot enforce single-use across
//     lambdas or block a determined learner from taking many
//     attempts in different browsers. Rate limits (per instance)
//     and registry-side duplicate checks reduce but do not remove
//     that gap. Documented in SECURITY_AUDIT.md §Limitations.
// ────────────────────────────────────────────────────────────

import { base64urlDecode, base64urlEncode, hkdf, hmacHex, randomToken, safeEqual } from './crypto';

export type TokenPurpose = 'attempt' | 'result';

export interface AttemptTokenPayload {
  v: 1;
  p: 'attempt';
  /** topic id */
  t: string;
  /** level id */
  l: string;
  /** blueprint id */
  b: string;
  /** bank version */
  bv: string;
  /** opaque item refs, in service order */
  q: string[];
  /** recipient binding (see recipientRef) */
  r: string;
  /** pseudonymous learner reference (HMAC of the email) — no PII */
  lr: string;
  /** issued at (ms epoch) */
  i: number;
  /** expires at (ms epoch) */
  e: number;
  /** attempt nonce */
  n: string;
}

export interface ResultTokenPayload {
  v: 1;
  p: 'result';
  t: string;
  l: string;
  b: string;
  bv: string;
  /** attempt nonce this result belongs to */
  n: string;
  /** binding hash of the source attempt token */
  ab: string;
  /** item refs served in the attempt (used to list skills assessed) */
  q: string[];
  /** recipient binding */
  r: string;
  /** pseudonymous learner reference */
  lr: string;
  /** score 0-100 */
  s: number;
  /** correct count */
  c: number;
  /** total items */
  x: number;
  /** passed */
  ok: boolean;
  /** submission reason */
  rs: string;
  /** self-reported violations (advisory) */
  sv: number;
  i: number;
  e: number;
}

export type TokenPayload = AttemptTokenPayload | ResultTokenPayload;

function tokenKey(secret: string, purpose: TokenPurpose): Buffer {
  return hkdf(secret, `token-${purpose}`);
}

export function signToken(secret: string, payload: TokenPayload): string {
  const body = base64urlEncode(JSON.stringify(payload));
  const mac = base64urlEncode(hmacHex(tokenKey(secret, payload.p), body, 64));
  return `${body}.${mac}`;
}

/**
 * Verify a token: signature, purpose, shape and expiry.
 * Returns a discriminated result so callers can distinguish
 * "tampered" from "expired" without leaking which check failed to
 * an attacker (the HTTP layer maps them to the same 400/410 family).
 */
export function verifyToken<T extends TokenPayload>(
  secret: string,
  token: string,
  purpose: TokenPurpose,
  now = Date.now(),
): { ok: true; payload: T } | { ok: false; reason: 'malformed' | 'bad_signature' | 'expired' | 'wrong_purpose' } {
  if (typeof token !== 'string' || token.length > 8192) return { ok: false, reason: 'malformed' };
  const parts = token.split('.');
  if (parts.length !== 2) return { ok: false, reason: 'malformed' };
  const [body, mac] = parts;

  const expected = base64urlEncode(hmacHex(tokenKey(secret, purpose), body, 64));
  if (!safeEqual(expected, mac)) return { ok: false, reason: 'bad_signature' };

  const raw = base64urlDecode(body);
  if (!raw) return { ok: false, reason: 'malformed' };

  let payload: TokenPayload;
  try {
    payload = JSON.parse(raw.toString('utf8')) as TokenPayload;
  } catch {
    return { ok: false, reason: 'malformed' };
  }

  if (!payload || payload.v !== 1 || typeof payload.p !== 'string') return { ok: false, reason: 'malformed' };
  if (payload.p !== purpose) return { ok: false, reason: 'wrong_purpose' };
  if (typeof payload.e !== 'number' || typeof payload.i !== 'number') return { ok: false, reason: 'malformed' };
  if (now > payload.e) return { ok: false, reason: 'expired' };

  return { ok: true, payload: payload as T };
}

/** Grace period for submissions that race the deadline (network latency). */
export const SUBMIT_GRACE_SEC = 30;

export function newNonce(): string {
  return randomToken(16);
}
