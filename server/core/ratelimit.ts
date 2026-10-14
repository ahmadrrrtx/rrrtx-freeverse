// ────────────────────────────────────────────────────────────
// RRRTX FreeVerse — best-effort rate limiting
//
// LIMITATION (documented, not hidden): this counter lives in the
// memory of one serverless instance. Vercel may run many instances
// and recycle them, so the effective limit is
// `configured limit × live instances`. It stops casual flooding and
// scripted abuse from a single client; it is not a distributed
// quota. Adding Upstash/Redis would make it exact — a deliberate
// future step, not a claim we make now.
// ────────────────────────────────────────────────────────────

import { ApiError } from './http';

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_TRACKED_KEYS = 20_000;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function consume(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
  if (buckets.size > MAX_TRACKED_KEYS) {
    // Cheap eviction: drop expired buckets before growing further.
    for (const [k, v] of buckets) {
      if (v.resetAt <= now) buckets.delete(k);
      if (buckets.size <= MAX_TRACKED_KEYS / 2) break;
    }
  }

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const fresh: Bucket = { count: 1, resetAt: now + windowMs };
    buckets.set(key, fresh);
    return { allowed: true, remaining: limit - 1, resetAt: fresh.resetAt };
  }

  existing.count += 1;
  if (existing.count > limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }
  return { allowed: true, remaining: limit - existing.count, resetAt: existing.resetAt };
}

export function enforceRateLimit(key: string, limit: number, windowMs: number, now = Date.now()): void {
  const result = consume(key, limit, windowMs, now);
  if (!result.allowed) {
    const retryAfter = Math.max(1, Math.ceil((result.resetAt - now) / 1000));
    throw new ApiError('rate_limited', 'Too many requests. Please wait and try again.', {
      retryable: true,
      headers: { 'Retry-After': String(retryAfter) },
      details: { retryAfterSec: retryAfter },
    });
  }
}

/** Test helper — never shipped in a request path. */
export function resetRateLimits(): void {
  buckets.clear();
}
