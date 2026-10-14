// ────────────────────────────────────────────────────────────
// RRRTX FreeVerse — server configuration
//
// Environment variables (NAMES ONLY — never log or return values):
//   FREEVERSE_SIGNING_SECRET          required — signs attempt/result tokens
//   FREEVERSE_BANK_KEY                required — unseals the answer key
//   FREEVERSE_BANK_KEYS_OLD           optional — JSON map { keyId: secret } for rotation
//   FREEVERSE_ISSUER_KEY              required for issuance — Ed25519 seed (base64url) or PKCS#8 PEM
//   GH_REGISTRY_TOKEN                 required for issuance — GitHub PAT (contents:write on the registry repo only)
//   FREEVERSE_REGISTRY_REPO           optional — default ahmadrrrtx/rrrtx-freeverse-certs
//   FREEVERSE_REGISTRY_BRANCH         optional — default main
//   FREEVERSE_ALLOWED_ORIGINS         optional — comma-separated extra origins allowed to call the API
//   FREEVERSE_VERIFY_BASE_URL         optional — canonical public origin, used in QR/verify URLs
//   FREEVERSE_REQUIRE_VERIFIED_BANK   optional — "1" refuses to start assessments whose item bank
//                                                has not passed the automated quality gate
// ────────────────────────────────────────────────────────────

export interface RateLimits {
  startAttempt: number;
  gradeAttempt: number;
  issueCredential: number;
  verify: number;
  rereadResult: number;
  windowMs: number;
}

export interface ServerConfig {
  isProduction: boolean;
  signingSecret: string | null;
  bankKey: string | null;
  bankKeysOld: Record<string, string>;
  issuerSeed: string | null;
  ghToken: string | null;
  registry: { owner: string; repo: string; branch: string };
  allowedOrigins: string[];
  verifyBaseUrl: string | null;
  requireVerifiedBank: boolean;
  limits: RateLimits;
  /** Maximum accepted request body (bytes). */
  maxBodyBytes: number;
}

function env(name: string): string | null {
  // Vercel Node runtime exposes process.env; the guard keeps this module
  // importable in environments without a process object (e.g. unit tests).
  const value = typeof process !== 'undefined' ? process.env?.[name] : undefined;
  return value && String(value).trim().length > 0 ? String(value).trim() : null;
}

export function loadConfig(): ServerConfig {
  const repoEnv = env('FREEVERSE_REGISTRY_REPO') ?? 'ahmadrrrtx/rrrtx-freeverse-certs';
  const [owner, repo] = repoEnv.includes('/') ? repoEnv.split('/') : ['ahmadrrrtx', repoEnv];

  let bankKeysOld: Record<string, string> = {};
  const oldRaw = env('FREEVERSE_BANK_KEYS_OLD');
  if (oldRaw) {
    try {
      const parsed = JSON.parse(oldRaw) as Record<string, string>;
      if (parsed && typeof parsed === 'object') bankKeysOld = parsed;
    } catch {
      // Deliberately silent: a malformed rotation map must not break grading,
      // and the value must never be echoed into a response or log.
      bankKeysOld = {};
    }
  }

  return {
    isProduction: env('VERCEL_ENV') === 'production' || env('NODE_ENV') === 'production',
    signingSecret: env('FREEVERSE_SIGNING_SECRET'),
    bankKey: env('FREEVERSE_BANK_KEY'),
    bankKeysOld,
    issuerSeed: env('FREEVERSE_ISSUER_KEY'),
    ghToken: env('GH_REGISTRY_TOKEN'),
    registry: {
      owner: env('FREEVERSE_REGISTRY_OWNER') ?? owner ?? 'ahmadrrrtx',
      repo: repo ?? 'rrrtx-freeverse-certs',
      branch: env('FREEVERSE_REGISTRY_BRANCH') ?? 'main',
    },
    allowedOrigins: (env('FREEVERSE_ALLOWED_ORIGINS') ?? '')
      .split(',')
      .map((o) => o.trim().replace(/\/$/, ''))
      .filter(Boolean),
    verifyBaseUrl: env('FREEVERSE_VERIFY_BASE_URL')?.replace(/\/$/, '') ?? null,
    requireVerifiedBank: env('FREEVERSE_REQUIRE_VERIFIED_BANK') === '1',
    limits: {
      startAttempt: 12,
      gradeAttempt: 40,
      issueCredential: 15,
      verify: 300,
      rereadResult: 120,
      windowMs: 60 * 60 * 1000,
    },
    maxBodyBytes: 64 * 1024,
  };
}

export interface CapabilityReport {
  grading: boolean;
  issuance: boolean;
  verification: boolean;
  registryConfigured: boolean;
  problems: string[];
}

/**
 * Which capabilities are usable with the current environment.
 * Names only in `problems` — never values.
 */
export function capabilities(cfg: ServerConfig): CapabilityReport {
  const problems: string[] = [];
  if (!cfg.signingSecret) problems.push('FREEVERSE_SIGNING_SECRET is not set — assessments are disabled (fail closed).');
  if (!cfg.bankKey) problems.push('FREEVERSE_BANK_KEY is not set — the answer key cannot be unsealed (fail closed).');
  if (!cfg.issuerSeed) problems.push('FREEVERSE_ISSUER_KEY is not set — credential issuance is disabled (fail closed).');
  if (!cfg.ghToken) problems.push('GH_REGISTRY_TOKEN is not set — credential issuance is disabled (fail closed).');
  return {
    grading: Boolean(cfg.signingSecret && cfg.bankKey),
    issuance: Boolean(cfg.signingSecret && cfg.bankKey && cfg.issuerSeed && cfg.ghToken),
    verification: true,
    registryConfigured: Boolean(cfg.ghToken),
    problems,
  };
}
