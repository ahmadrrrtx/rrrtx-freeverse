// ────────────────────────────────────────────────────────────
// RRRTX FreeVerse — request context helpers shared by routes
// ────────────────────────────────────────────────────────────

import { capabilities, loadConfig, type ServerConfig } from './config';
import { ApiError } from './http';
import { Registry } from './registry';

/** Canonical public origin used in credentials, QR codes and share links. */
export const DEFAULT_PUBLIC_ORIGIN = 'https://rrrtx-freeverse.vercel.app';

export interface Context {
  cfg: ServerConfig;
  registry: Registry;
}

let contextCache: Context | null = null;

/**
 * Test seam: inject a context (config + registry) so route-level regression
 * tests can run without touching the network. Never called from app code.
 */
export function __setContextForTests(next: Context | null): void {
  contextCache = next;
}

export function context(): Context {
  if (!contextCache) {
    const cfg = loadConfig();
    contextCache = { cfg, registry: new Registry(cfg) };
  }
  return contextCache;
}

export function requireGrading(cfg: ServerConfig): void {
  if (!cfg.signingSecret || !cfg.bankKey) {
    throw new ApiError(
      'engine_unavailable',
      'Assessments are disabled on this deployment: the server signing secret or the bank key is not configured. See SECURITY_AUDIT.md §Environment variables.',
    );
  }
}

export function requireIssuance(cfg: ServerConfig): void {
  requireGrading(cfg);
  const report = capabilities(cfg);
  if (!report.issuance) {
    throw new ApiError(
      'engine_unavailable',
      'Credential issuance is disabled on this deployment: the issuer key or the registry token is not configured. See SECURITY_AUDIT.md §Environment variables.',
    );
  }
}

/**
 * Public origin for verify URLs.
 * Never taken from the Host header unless that host is explicitly allow-listed,
 * so a spoofed Host cannot poison the verify_url written into a credential.
 */
export function publicBaseUrl(req: Request, cfg: ServerConfig): string {
  if (cfg.verifyBaseUrl) return cfg.verifyBaseUrl;
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  if (host) {
    const origin = `https://${host}`;
    if (cfg.allowedOrigins.some((o) => o === origin)) return origin;
  }
  return DEFAULT_PUBLIC_ORIGIN;
}
