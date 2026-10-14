// ────────────────────────────────────────────────────────────
// RRRTX FreeVerse — GitHub registry client
//
// The public registry (github.com/ahmadrrrtx/rrrtx-freeverse-certs)
// remains the source of truth for "does this credential exist".
// Rules enforced here:
//   • reads go through raw.githubusercontent.com (no token, no
//     per-IP API quota);
//   • writes go through the Contents API with the token that is
//     only ever read from server env (GH_REGISTRY_TOKEN);
//   • a credential file is created at most once — never updated,
//     never overwritten. Repository history is the audit log;
//   • a GitHub failure is surfaced as an error, never as success.
// ────────────────────────────────────────────────────────────

import type { ServerConfig } from './config';
import { ApiError, logEvent } from './http';

const READ_TIMEOUT_MS = 8000;
const WRITE_TIMEOUT_MS = 12000;

export interface RegistryWriteResult {
  created: boolean;
  alreadyExisted: boolean;
  commitUrl: string | null;
}

export interface RevocationEntry {
  id: string;
  revoked_at: string;
  reason: string;
}

export interface RevocationList {
  reachable: boolean;
  revoked: RevocationEntry[];
}

export interface LearnerAttemptRecord {
  topic: string;
  level: string;
  at: string;
  score: number;
  passed: boolean;
}

export interface LearnerRecord {
  schema: 'rfv.learner/1';
  ref: string;
  updated_at: string;
  credentials: { topic: string; level: string; id: string; issued_at: string; status: 'valid' | 'revoked' }[];
  attempts: LearnerAttemptRecord[];
}

const REVOCATION_TTL_MS = 5 * 60 * 1000;
const revocationCache = { at: 0, value: null as RevocationList | null };

function safePathSegment(segment: string): string {
  return String(segment).replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 96);
}

export class Registry {
  constructor(private readonly cfg: ServerConfig) {}

  /** Public slug, safe to expose in URLs shown to users. */
  get publicSlug(): string {
    return this.slug;
  }

  private get slug(): string {
    return `${this.cfg.registry.owner}/${this.cfg.registry.repo}`;
  }

  private rawUrl(path: string): string {
    const branch = encodeURIComponent(this.cfg.registry.branch);
    return `https://raw.githubusercontent.com/${this.slug}/${branch}/${path
      .split('/')
      .map(encodeURIComponent)
      .join('/')}`;
  }

  /** GET a public raw file. Returns null on 404 (a legitimate "absent"). */
  async readRawText(path: string): Promise<string | null> {
    try {
      const res = await fetch(this.rawUrl(path), {
        headers: { Accept: 'text/plain' },
        signal: AbortSignal.timeout(READ_TIMEOUT_MS),
        cache: 'no-store',
      });
      if (res.status === 404) return null;
      if (!res.ok) {
        logEvent('registry_read_failed', { path, status: res.status });
        throw new ApiError('registry_unavailable', 'The credential registry is temporarily unavailable.', { retryable: true });
      }
      return await res.text();
    } catch (e) {
      if (e instanceof ApiError) throw e;
      logEvent('registry_read_error', { path, name: e instanceof Error ? e.name : 'unknown' });
      throw new ApiError('registry_unavailable', 'The credential registry is temporarily unavailable.', { retryable: true });
    }
  }

  async readJson<T>(path: string): Promise<T | null> {
    const text = await this.readRawText(path);
    if (text === null) return null;
    try {
      return JSON.parse(text) as T;
    } catch {
      logEvent('registry_parse_failed', { path });
      throw new ApiError('registry_unavailable', 'A registry record could not be parsed.', { retryable: true });
    }
  }

  credentialPath(id: string, issuedAt: string | null): string {
    const year = /^RFV-(\d{4})-/.exec(id)?.[1] ?? (issuedAt ? new Date(issuedAt).getUTCFullYear().toString() : '0000');
    const month = issuedAt ? String(new Date(issuedAt).getUTCMonth() + 1).padStart(2, '0') : null;
    if (month) return `certs/${year}/${month}/${id}.json`;
    return `certs/${year}/${id}.json`;
  }

  /**
   * Look up a credential record. The month is not encoded in the id, so we try
   * every month in parallel — cheap, CDN-cached, and immune to the
   * unauthenticated API rate limit that a directory listing would hit.
   */
  async readCredential(id: string): Promise<{ path: string; record: Record<string, unknown> } | null> {
    const year = /^RFV-(\d{4})-/.exec(id)?.[1];
    if (!year) return null;

    const candidates = Array.from({ length: 12 }, (_, i) => `certs/${year}/${String(i + 1).padStart(2, '0')}/${id}.json`);
    candidates.push(`certs/${year}/${id}.json`);

    // "This record does not exist" and "the registry could not be reached"
    // are different answers, and confusing them is damaging: during an
    // outage a real learner's credential would be reported as not-found.
    // Failures are therefore collected and surfaced as an outage instead of
    // being flattened into an absent record.
    const results = await Promise.all(
      candidates.map(async (path): Promise<{ path: string; record: Record<string, unknown> | null; failed: boolean }> => {
        try {
          return { path, record: await this.readJson<Record<string, unknown>>(path), failed: false };
        } catch {
          return { path, record: null, failed: true };
        }
      }),
    );

    const hit = results.find((r) => r.record !== null);
    if (hit) return { path: hit.path, record: hit.record as Record<string, unknown> };

    if (results.some((r) => r.failed)) {
      logEvent('registry_read_degraded', { id });
      throw new ApiError(
        'registry_unavailable',
        'The credential registry could not be reached, so this credential cannot be checked right now.',
        { retryable: true },
      );
    }
    return null;
  }

  /** Create a file only if it does not already exist. Never overwrites. */
  async createOnly(path: string, body: string, message: string): Promise<RegistryWriteResult> {
    if (!this.cfg.ghToken) {
      throw new ApiError('engine_unavailable', 'Credential issuance is disabled: GH_REGISTRY_TOKEN is not configured.');
    }

    // Cheap existence probe via the public CDN before spending an API call.
    const existing = await this.readRawText(path).catch(() => null);
    if (existing !== null) {
      return { created: false, alreadyExisted: true, commitUrl: null };
    }

    const res = await this.githubWrite(path, body, message, null);
    if (res.ok) {
      return { created: true, alreadyExisted: false, commitUrl: (res.body?.commit as { html_url?: string } | undefined)?.html_url ?? null };
    }

    // 409/422 mean "the file appeared underneath us" (concurrent request).
    if (res.status === 409 || res.status === 422) {
      const raced = await this.readRawText(path).catch(() => null);
      if (raced !== null) return { created: false, alreadyExisted: true, commitUrl: null };
    }

    logEvent('registry_write_failed', { path, status: res.status });
    throw new ApiError(
      'registry_unavailable',
      'The credential registry rejected the write. Nothing was issued — please retry.',
      { retryable: res.status >= 500 || res.status === 403 || res.status === 429 },
    );
  }

  /** Update a mutable file (learner index) using optimistic concurrency. */
  async updateWithSha(path: string, body: string, message: string, sha: string | null): Promise<boolean> {
    if (!this.cfg.ghToken) return false;
    const res = await this.githubWrite(path, body, message, sha);
    if (res.ok) return true;
    logEvent('registry_update_failed', { path, status: res.status });
    return false;
  }

  private async githubWrite(
    path: string,
    body: string,
    message: string,
    sha: string | null,
  ): Promise<{ ok: boolean; status: number; body: Record<string, unknown> | null }> {
    const token = this.cfg.ghToken!;
    try {
      const res = await fetch(`https://api.github.com/repos/${this.slug}/contents/${path}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          content: Buffer.from(body, 'utf8').toString('base64'),
          branch: this.cfg.registry.branch,
          ...(sha ? { sha } : {}),
          committer: { name: 'RRRTX FreeVerse Bot', email: 'noreply@rrrtx.dev' },
        }),
        signal: AbortSignal.timeout(WRITE_TIMEOUT_MS),
      });

      let parsed: Record<string, unknown> | null = null;
      const text = await res.text();
      if (text) {
        try {
          parsed = JSON.parse(text) as Record<string, unknown>;
        } catch {
          parsed = null; // never surface raw upstream text to a client
        }
      }
      return { ok: res.ok, status: res.status, body: parsed };
    } catch (e) {
      logEvent('registry_write_error', { path, name: e instanceof Error ? e.name : 'unknown' });
      return { ok: false, status: 0, body: null };
    }
  }

  async readWithSha(path: string): Promise<{ text: string; sha: string } | null> {
    if (!this.cfg.ghToken) return null;
    try {
      const res = await fetch(`https://api.github.com/repos/${this.slug}/contents/${path}?ref=${encodeURIComponent(this.cfg.registry.branch)}`, {
        headers: {
          Authorization: `Bearer ${this.cfg.ghToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        signal: AbortSignal.timeout(READ_TIMEOUT_MS),
        cache: 'no-store',
      });
      if (res.status === 404) return null;
      if (!res.ok) {
        logEvent('registry_sha_read_failed', { path, status: res.status });
        return null;
      }
      const json = (await res.json()) as { content?: string; sha?: string };
      if (!json.content || !json.sha) return null;
      return { text: Buffer.from(json.content, 'base64').toString('utf8'), sha: json.sha };
    } catch (e) {
      logEvent('registry_sha_read_error', { path, name: e instanceof Error ? e.name : 'unknown' });
      return null;
    }
  }

  async readRevocations(force = false): Promise<RevocationList> {
    const now = Date.now();
    if (!force && revocationCache.value && now - revocationCache.at < REVOCATION_TTL_MS) return revocationCache.value;
    try {
      const raw = await this.readJson<{ revoked?: RevocationEntry[] }>('revocations.json');
      const value: RevocationList = {
        reachable: true,
        revoked: Array.isArray(raw?.revoked)
          ? raw!.revoked!.filter((r) => typeof r?.id === 'string').map((r) => ({
              id: r.id,
              revoked_at: typeof r.revoked_at === 'string' ? r.revoked_at : '',
              reason: typeof r.reason === 'string' ? r.reason : 'not stated',
            }))
          : [],
      };
      revocationCache.at = now;
      revocationCache.value = value;
      return value;
    } catch (e) {
      if (e instanceof ApiError) {
        // Cache the negative result briefly so one outage does not fan out.
        const value: RevocationList = { reachable: false, revoked: [] };
        revocationCache.at = now;
        revocationCache.value = value;
        return value;
      }
      throw e;
    }
  }

  learnerPath(ref: string): string {
    return `learners/${safePathSegment(ref.replace(/^hmac-sha256:/, 'hs_'))}.json`;
  }

  async readLearner(ref: string): Promise<LearnerRecord | null> {
    return this.readJson<LearnerRecord>(this.learnerPath(ref));
  }

  /** Best-effort learner history update. Never blocks issuance. */
  async appendLearnerRecord(ref: string, patch: { credential?: { topic: string; level: string; id: string; issued_at: string; status: 'valid' | 'revoked' }; attempt?: LearnerAttemptRecord }): Promise<boolean> {
    if (!this.cfg.ghToken) return false;
    const path = this.learnerPath(ref);
    try {
      const current = await this.readWithSha(path);
      const base: LearnerRecord = current
        ? (JSON.parse(current.text) as LearnerRecord)
        : { schema: 'rfv.learner/1', ref, updated_at: new Date().toISOString(), credentials: [], attempts: [] };

      if (patch.credential && !base.credentials.some((c) => c.id === patch.credential!.id)) {
        base.credentials.push(patch.credential);
      }
      if (patch.attempt) {
        base.attempts.push(patch.attempt);
        base.attempts = base.attempts.slice(-25);
      }
      base.updated_at = new Date().toISOString();

      return await this.updateWithSha(
        path,
        `${JSON.stringify(base, null, 2)}\n`,
        `chore(learners): update history for ${safePathSegment(ref).slice(0, 24)}`,
        current?.sha ?? null,
      );
    } catch (e) {
      logEvent('learner_record_failed', { name: e instanceof Error ? e.name : 'unknown' });
      return false;
    }
  }

  async readIssuerPublicKey(keyId: string): Promise<string | null> {
    const record = await this.readJson<{ key_id?: string; public_key_pem?: string }>(`issuer-keys/${safePathSegment(keyId)}.json`);
    if (!record?.public_key_pem || record.key_id !== keyId) return null;
    return record.public_key_pem;
  }

  async publishIssuerKey(keyId: string, publicKeyPem: string): Promise<void> {
    const path = `issuer-keys/${safePathSegment(keyId)}.json`;
    const body = `${JSON.stringify(
      {
        schema: 'rfv.issuer-key/1',
        key_id: keyId,
        alg: 'Ed25519',
        public_key_pem: publicKeyPem,
        purpose: 'Signs RRRTX FreeVerse credential records (canonical-json-v1).',
        usage: 'Verify offline: strip `signature` from a record, canonicalise the remaining JSON (sorted keys, no whitespace) and verify with this key.',
      },
      null,
      2,
    )}\n`;
    await this.createOnly(path, body, `feat(issuer): publish public key ${keyId}`);
  }
}
