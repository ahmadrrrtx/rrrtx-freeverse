// ────────────────────────────────────────────────────────────
// RRRTX FreeVerse — local session + history storage
//
// Everything here is a CACHE for display and crash recovery. It is
// never a source of truth: the score, the pass/fail decision and
// the credential all come from the server. A learner who edits
// localStorage can change what their own browser shows, and nothing
// else — the verification page and the registry are unaffected.
// ────────────────────────────────────────────────────────────

import type { AttemptQuestion, AttemptResult, LevelId, PublicCredential, ReviewItem } from '../types';

const KEYS = {
  attempt: 'rfv:attempt2',      // in-progress attempt (sessionStorage)
  result: 'rfv:result2',        // finalised results, newest first (localStorage)
  credentials: 'rfv:credentials2', // issued credential cache (display only)
  pendingIssue: 'rfv:pendingIssue2', // result token awaiting successful issuance
  legacyResults: 'rfv:results',
  legacyCerts: 'rfv:certificates',
  legacyUser: 'rfv:user',
} as const;

function readSession<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeSession(key: string, value: unknown | null): void {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode) — the UI degrades to in-memory state */
  }
}

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota/private-mode failures */
  }
}

// ── In-progress attempt ─────────────────────────────────────
export interface StoredAttempt {
  attemptToken: string;
  topicId: string;
  level: LevelId;
  topicTitle: string;
  questions: AttemptQuestion[];
  answers: (number | null)[];
  currentIndex: number;
  startedAt: number;
  endsAt: number;
  passingScore: number;
  violations: number;
  source?: string;
}

export function saveAttempt(attempt: StoredAttempt): void {
  writeSession(KEYS.attempt, attempt);
}

export function loadAttempt(): StoredAttempt | null {
  const attempt = readSession<StoredAttempt>(KEYS.attempt);
  if (!attempt) return null;
  if (!attempt.attemptToken || !Array.isArray(attempt.questions)) return null;
  return attempt;
}

export function clearAttempt(): void {
  writeSession(KEYS.attempt, null);
}

// ── Finalised results ───────────────────────────────────────
export interface StoredResult {
  result: AttemptResult;
  review: ReviewItem[];
  savedAt: string;
}

export function saveResult(entry: StoredResult): void {
  const all = readLocal<StoredResult[]>(KEYS.result, []).filter(
    (r) => !(r.result.topicId === entry.result.topicId && r.result.resultToken === entry.result.resultToken),
  );
  writeLocal(KEYS.result, [entry, ...all].slice(0, 30));
}

export function getResults(): StoredResult[] {
  return readLocal<StoredResult[]>(KEYS.result, []);
}

export function getResultForTopic(topicId: string): StoredResult | null {
  return getResults().find((r) => r.result.topicId === topicId) ?? null;
}

export function findResultByToken(resultToken: string): StoredResult | null {
  return getResults().find((r) => r.result.resultToken === resultToken) ?? null;
}

// ── Issued credentials (display cache) ──────────────────────
export function cacheCredential(credential: PublicCredential): void {
  const all = readLocal<PublicCredential[]>(KEYS.credentials, []).filter((c) => c.id !== credential.id);
  writeLocal(KEYS.credentials, [credential, ...all].slice(0, 40));
}

export function getCachedCredentials(): PublicCredential[] {
  return readLocal<PublicCredential[]>(KEYS.credentials, []);
}

export function findCachedCredential(id: string): PublicCredential | null {
  return getCachedCredentials().find((c) => c.id === id) ?? null;
}

// ── Pending issuance (so a GitHub outage is recoverable) ────
export interface PendingIssuance {
  resultToken: string;
  topicId: string;
  level: LevelId;
  recipient: { displayName: string; email: string };
  queuedAt: string;
}

export function queuePendingIssuance(pending: PendingIssuance): void {
  const all = readLocal<PendingIssuance[]>(KEYS.pendingIssue, []).filter(
    (p) => !(p.topicId === pending.topicId && p.level === pending.level),
  );
  writeLocal(KEYS.pendingIssue, [pending, ...all].slice(0, 10));
}

export function getPendingIssuances(): PendingIssuance[] {
  return readLocal<PendingIssuance[]>(KEYS.pendingIssue, []);
}

export function clearPendingIssuance(resultToken: string): void {
  writeLocal(
    KEYS.pendingIssue,
    getPendingIssuances().filter((p) => p.resultToken !== resultToken),
  );
}

// ── User profile ────────────────────────────────────────────
export function getUser(): { name: string; email: string } | null {
  const user = readLocal<{ name?: string; email?: string } | null>(KEYS.legacyUser, null);
  if (!user?.name || !user?.email) return null;
  return { name: user.name, email: user.email };
}

export function setUser(user: { name: string; email: string }): void {
  writeLocal(KEYS.legacyUser, user);
}

// ── Export / import (data portability) ──────────────────────
export function exportAll(): string {
  return JSON.stringify(
    {
      version: 2,
      exportedAt: new Date().toISOString(),
      user: getUser(),
      results: getResults(),
      credentials: getCachedCredentials(),
    },
    null,
    2,
  );
}

export function importAll(json: string): boolean {
  try {
    const data = JSON.parse(json) as {
      user?: { name: string; email: string };
      results?: StoredResult[];
      credentials?: PublicCredential[];
    };
    if (data.user?.name && data.user?.email) setUser(data.user);
    if (Array.isArray(data.results)) writeLocal(KEYS.result, data.results.slice(0, 30));
    // Imported credentials are display-only: verification always re-checks the registry.
    if (Array.isArray(data.credentials)) writeLocal(KEYS.credentials, data.credentials.slice(0, 40));
    return true;
  } catch {
    return false;
  }
}

export function resetLocalData(): void {
  try {
    Object.values(KEYS).forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith('rfv:attempt'))
      .forEach((k) => sessionStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

/** Legacy local records, shown as "imported from this device" but never verified. */
export function getLegacyLocalRecords(): { results: unknown[]; certificates: unknown[] } {
  return {
    results: readLocal<unknown[]>(KEYS.legacyResults, []),
    certificates: readLocal<unknown[]>(KEYS.legacyCerts, []),
  };
}
