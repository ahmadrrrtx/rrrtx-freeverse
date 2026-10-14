// ────────────────────────────────────────────────────────────
// GET /api/health — deployment readiness (no secret values, ever)
//
// Reports only which capabilities are configured and whether the
// question bank is production-sealed, so an operator can see why
// an assessment or an issuance is refused without reading logs.
// ────────────────────────────────────────────────────────────

import { capabilities, loadConfig } from '../server/core/config';
import { bankKeyId, DEV_BANK_KEY, loadManifest } from '../server/core/bank';
import { defineRoute, jsonResponse, preflight, PUBLIC_CORS, requireMethod } from '../server/core/http';

export default defineRoute(async (req) => {
  const flight = preflight(req);
  if (flight) return flight;
  requireMethod(req, 'GET');
  const cfg = loadConfig();
  const report = capabilities(cfg);

  let bank: { version: string | null; devSealed: boolean | null; topics: number | null; error: string | null } = {
    version: null,
    devSealed: null,
    topics: null,
    error: null,
  };
  try {
    const manifest = loadManifest();
    bank = {
      version: manifest.bankVersion,
      devSealed: manifest.keyId === bankKeyId(DEV_BANK_KEY),
      topics: manifest.topics.length,
      error: null,
    };
  } catch {
    bank.error = 'manifest-unreadable';
  }

  const gradingUsable = report.grading && !(bank.devSealed && cfg.isProduction);

  return jsonResponse({
    ok: gradingUsable,
    environment: cfg.isProduction ? 'production' : 'development',
    capabilities: {
      grading: gradingUsable,
      issuance: report.issuance && !(bank.devSealed && cfg.isProduction),
      verification: true,
      registryConfigured: report.registryConfigured,
    },
    bank,
    limits: {
      startAttemptPerHour: cfg.limits.startAttempt,
      gradePerHour: cfg.limits.gradeAttempt,
      issuePerHour: cfg.limits.issueCredential,
      verifyPerHour: cfg.limits.verify,
    },
    notes: [
      ...report.problems,
      ...(bank.devSealed
        ? ['The question bank is sealed with the public development key. Run "FREEVERSE_BANK_KEY=<secret> npm run bank:build" before deploying.']
        : []),
    ],
  }, 200, { ...PUBLIC_CORS, 'Cache-Control': 'public, max-age=60' });
});
