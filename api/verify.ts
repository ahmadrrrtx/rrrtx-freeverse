// ────────────────────────────────────────────────────────────
// GET /api/verify?id=RFV-YYYY-XXXXXXXX — authoritative verification
//
// The verification page must never decide validity on the client.
// This route reads the registry record, checks the revocation list,
// verifies the Ed25519 signature when one is present, and reports
// one of: valid · revoked · not-found · invalid-id ·
// registry-unavailable · unauthenticated-record.
//
// A registry outage is reported as an outage. It is never silently
// rendered as "valid", and a plausible-looking id is never enough.
// ────────────────────────────────────────────────────────────

import type { PublicCredential, VerifyResponse, VerifyState } from '../shared/contracts';
import { context } from '../server/core/context';
import { loadIssuerKey } from '../server/core/crypto';
import { assertSameOrigin, clientIp, defineRoute, jsonResponse, logEvent, preflight, PUBLIC_CORS, requireMethod } from '../server/core/http';
import { toPublicCredential, recordVerifies, type RegistryCredentialRecord } from '../server/core/issuer';
import { enforceRateLimit } from '../server/core/ratelimit';

const CERT_ID_RE = /^RFV-\d{4}-[A-F0-9]{8}$/;

// Published-key cache: avoids re-fetching the registry on every verification.
const keyCache = new Map<string, { pem: string | null; at: number }>();
const KEY_TTL_MS = 10 * 60 * 1000;

export default defineRoute(async (req) => {
  const { cfg, registry } = context();
  const flight = preflight(req);
  if (flight) return flight;
  requireMethod(req, 'GET');
  assertSameOrigin(req, cfg);
  enforceRateLimit(`verify:${clientIp(req)}`, cfg.limits.verify, cfg.limits.windowMs);

  const url = new URL(req.url);
  const rawId = (url.searchParams.get('id') ?? '').trim();
  const id = rawId.toUpperCase();
  const notes: string[] = [];

  const respond = (state: VerifyState, credential: PublicCredential | null, extraNotes: string[] = []): Response => {
    const body: VerifyResponse = { state, checkedAt: new Date().toISOString(), credential, notes: [...notes, ...extraNotes] };
    // Public, read-only and cacheable for a minute: other apps (LearnPath, a
    // recruiter's dashboard) may call this cross-origin. Revocations are read on
    // every request, so the short TTL does not hide a revocation for long.
    return jsonResponse(body, 200, { ...PUBLIC_CORS, 'Cache-Control': 'public, max-age=60' });
  };

  if (!CERT_ID_RE.test(id)) {
    return respond('invalid-id', null, ['A credential id looks like RFV-YYYY-XXXXXXXX (eight hexadecimal characters).']);
  }

  // ── Registry record ──
  let found: { path: string; record: Record<string, unknown> } | null;
  try {
    found = await registry.readCredential(id);
  } catch (e) {
    logEvent('verify_registry_unavailable', { id, name: e instanceof Error ? e.name : 'unknown' });
    return respond('registry-unavailable', null, [
      'The public credential registry could not be reached, so this credential cannot be confirmed right now. Try again shortly.',
    ]);
  }

  if (!found) {
    return respond('not-found', null, ['No record with this id exists in the public registry.']);
  }

  const record = found.record as unknown as RegistryCredentialRecord;
  if (!record?.id || record.id !== id) {
    logEvent('verify_id_mismatch', { id, recordId: String(record?.id ?? 'none') });
    return respond('not-found', null, ['The registry record does not match the requested id.']);
  }

  // ── Revocation status ──
  const revocations = await registry.readRevocations();
  const revocation = revocations.revoked.find((r) => r.id === id) ?? null;
  if (!revocations.reachable) {
    notes.push('The revocation list could not be fetched, so current revocation status is unknown.');
  }

  // ── Provenance: signature check ──
  let provenance: 'signed' | 'legacy-unsigned' = 'legacy-unsigned';
  if (record.signature?.value) {
    const keyId = record.signature.key_id;
    let pem: string | null = null;

    const local = loadIssuerKey(cfg.issuerSeed);
    if (local && local.keyId === keyId) {
      pem = local.publicKeyPem;
    } else {
      const cached = keyCache.get(keyId);
      if (cached && Date.now() - cached.at < KEY_TTL_MS) {
        pem = cached.pem;
      } else {
        try {
          pem = await registry.readIssuerPublicKey(keyId);
        } catch {
          pem = null;
        }
        keyCache.set(keyId, { pem, at: Date.now() });
      }
    }

    if (!pem) {
      notes.push('The issuer public key for this record could not be retrieved, so the signature could not be checked.');
      return respond('registry-unavailable', toPublicCredential(record, { registryPath: found.path, provenance: 'legacy-unsigned', revocation: revocation ? { revokedAt: revocation.revoked_at, reason: revocation.reason } : null }), notes);
    }

    if (!recordVerifies(record, pem)) {
      logEvent('verify_signature_invalid', { id, keyId });
      return respond('unauthenticated-record', null, [
        'The registry record exists but its signature does not verify. Treat this credential as untrusted.',
      ]);
    }
    provenance = 'signed';
    notes.push('Signature verified against the issuer public key (Ed25519, canonical-json-v1).');
  } else {
    notes.push(
      'Legacy record: issued before server-side signing existed. The record is present in the registry and is not revoked, but it cannot be cryptographically verified.',
    );
  }

  const credential = toPublicCredential(record, {
    registryPath: found.path,
    provenance,
    revocation: revocation ? { revokedAt: revocation.revoked_at, reason: revocation.reason } : null,
  });

  if (record.assessment?.integrity_status === 'under-review') {
    notes.push(
      'Assessment-quality disclosure: this topic\u2019s item bank did not pass the automated quality gate, so this credential should be treated as provisional.',
    );
  }

  return respond(revocation ? 'revoked' : 'valid', credential);
});
