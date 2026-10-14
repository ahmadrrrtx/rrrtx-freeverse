// ────────────────────────────────────────────────────────────
// Shared test helpers.
//
// No test in this repository touches the real registry, issues a
// real credential, or attacks a live system. The GitHub client is
// replaced by an in-memory fake, and every signing key is generated
// per-test-run.
// ────────────────────────────────────────────────────────────

import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { loadConfig, type ServerConfig } from '../server/core/config';
import { Registry, type LearnerRecord, type RegistryWriteResult, type RevocationList } from '../server/core/registry';
import { __setContextForTests } from '../server/core/context';

export const TEST_BANK_KEY = 'rfv-dev-bank-key-not-for-production';
export const TEST_SIGNING_SECRET = 'test-signing-secret-not-a-real-deployment-value';

export function ed25519SeedBase64(): string {
  const { privateKey } = generateKeyPairSync('ed25519');
  const der = privateKey.export({ format: 'der', type: 'pkcs8' });
  // PKCS#8 for Ed25519 is a fixed 16-byte prefix + 32-byte seed.
  return Buffer.from(der.subarray(der.length - 32)).toString('base64url');
}

export function testConfig(overrides: Partial<ServerConfig> = {}): ServerConfig {
  const base = loadConfig();
  return {
    ...base,
    isProduction: false,
    signingSecret: TEST_SIGNING_SECRET,
    bankKey: TEST_BANK_KEY,
    issuerSeed: null,
    ghToken: null,
    allowedOrigins: [],
    verifyBaseUrl: 'https://rrrtx-freeverse.vercel.app',
    requireVerifiedBank: false,
    ...overrides,
  };
}

/** In-memory replacement for the GitHub registry. */
export class FakeRegistry extends Registry {
  readonly files = new Map<string, string>();
  readonly writes: string[] = [];
  publicKeyFailure = false;
  writeFailure: 'none' | 'upstream' = 'none';
  revocationReachable = true;
  revokedIds: { id: string; revoked_at: string; reason: string }[] = [];

  constructor(cfg: ServerConfig) {
    super(cfg);
  }

  override async readRawText(path: string): Promise<string | null> {
    return this.files.get(path) ?? null;
  }

  override async readJson<T>(path: string): Promise<T | null> {
    const raw = this.files.get(path);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  override async readCredential(id: string): Promise<{ path: string; record: Record<string, unknown> } | null> {
    const year = /^RFV-(\d{4})-/.exec(id)?.[1];
    if (!year) return null;
    for (let month = 1; month <= 12; month += 1) {
      const path = `certs/${year}/${String(month).padStart(2, '0')}/${id}.json`;
      const raw = this.files.get(path);
      if (raw) return { path, record: JSON.parse(raw) as Record<string, unknown> };
    }
    return null;
  }

  override async createOnly(path: string, body: string, _message: string): Promise<RegistryWriteResult> {
    void _message;
    if (this.writeFailure === 'upstream') {
      const { ApiError } = await import('../server/core/http');
      throw new ApiError('registry_unavailable', 'simulated upstream failure', { retryable: true });
    }
    if (this.files.has(path)) return { created: false, alreadyExisted: true, commitUrl: null };
    this.files.set(path, body);
    this.writes.push(path);
    return { created: true, alreadyExisted: false, commitUrl: `https://example.test/commit/${this.writes.length}` };
  }

  override async updateWithSha(path: string, body: string, _message: string): Promise<boolean> {
    void _message;
    this.files.set(path, body);
    return true;
  }

  override async readWithSha(): Promise<{ text: string; sha: string } | null> {
    return null;
  }

  override async readRevocations(): Promise<RevocationList> {
    return { reachable: this.revocationReachable, revoked: this.revokedIds };
  }

  override async readLearner(ref: string): Promise<LearnerRecord | null> {
    const raw = this.files.get(this.learnerPath(ref));
    return raw ? (JSON.parse(raw) as LearnerRecord) : null;
  }

  override async appendLearnerRecord(ref: string, patch: Parameters<Registry['appendLearnerRecord']>[1]): Promise<boolean> {
    const path = this.learnerPath(ref);
    const current: LearnerRecord = this.files.has(path)
      ? (JSON.parse(this.files.get(path)!) as LearnerRecord)
      : { schema: 'rfv.learner/1', ref, updated_at: new Date().toISOString(), credentials: [], attempts: [] };
    if (patch.credential) current.credentials.push(patch.credential);
    if (patch.attempt) current.attempts = [...current.attempts, patch.attempt].slice(-25);
    this.files.set(path, JSON.stringify(current));
    return true;
  }

  override async readIssuerPublicKey(keyId: string): Promise<string | null> {
    if (this.publicKeyFailure) return null;
    const raw = this.files.get(`issuer-keys/${keyId}.json`);
    return raw ? (JSON.parse(raw).public_key_pem as string) : null;
  }

  override async publishIssuerKey(keyId: string, publicKeyPem: string): Promise<void> {
    const path = `issuer-keys/${keyId}.json`;
    if (!this.files.has(path)) this.files.set(path, JSON.stringify({ key_id: keyId, public_key_pem: publicKeyPem }));
  }
}

export function installContext(cfg: ServerConfig, registry: Registry): void {
  __setContextForTests({ cfg, registry });
}

export function clearContext(): void {
  __setContextForTests(null);
}

export function jsonRequest(url: string, body: unknown, method = 'POST'): Request {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function randomEmail(): string {
  return `learner-${randomBytes(4).toString('hex')}@example.test`;
}
