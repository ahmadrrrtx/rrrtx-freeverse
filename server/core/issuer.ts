// ────────────────────────────────────────────────────────────
// RRRTX FreeVerse — credential issuance + verification
//
// Issuance is only reachable from a server-signed RESULT token
// that the server minted immediately after grading a passing
// attempt. Consequences:
//   • the client cannot invent a score, a pass or a credential;
//   • a retried or replayed request maps to the same credential id
//     (derived from the attempt nonce + signing secret), and the
//     registry write is create-once, so retries cannot duplicate;
//   • the record is signed with Ed25519 so any third party can
//     verify it offline against the published public key.
// ────────────────────────────────────────────────────────────

import type { PublicCredential, CredentialStatus } from '../../shared/contracts';
import { CREDENTIAL_DISCLOSURE, LEVELS, type LevelId } from '../../shared/levels';
import { canonical, hkdf, hmacHex, loadIssuerKey, signEd25519, verifyEd25519, type IssuerKey } from './crypto';
import type { ServerConfig } from './config';
import { ApiError, logEvent } from './http';
import { Registry } from './registry';
import type { ResultTokenPayload } from './tokens';

export const CREDENTIAL_SCHEMA = 'rfv.credential/2';

export interface RegistryCredentialRecord {
  schema: string;
  id: string;
  status: CredentialStatus;
  subject: { display_name: string; learner_ref: string };
  credential: {
    definition_id: string;
    topic_id: string;
    title: string;
    level: string;
    level_label: string;
    skills: { skill_id: string; name: string }[];
  };
  assessment: {
    method: string;
    question_count: number;
    score: number;
    passing_score: number;
    bank_version: string;
    blueprint_id: string;
    integrity_status: string;
    item_pool: string;
    skill_coverage: { assessed: number; total: number };
    skill_gaps: string[];
  };
  issued_at: string;
  issuer: { name: string; url: string };
  verify_url: string;
  signature?: { alg: 'Ed25519'; key_id: string; signed_fields: string; value: string };
}

/**
 * Shape of a pre-2.0 registry record (the three files that already exist in
 * the public registry). Those credentials must keep verifying, so they are
 * mapped explicitly instead of being treated as malformed.
 */
export interface LegacyCredentialRecord {
  id: string;
  recipient?: { name?: string; email_hash?: string };
  quiz?: { id?: string; title?: string; version?: string };
  score?: number;
  issued_at?: string;
  issuer?: string;
  verify_url?: string;
  integrity?: { violations?: number; completed_in_secure_mode?: boolean };
}

export function issuerKey(cfg: ServerConfig): IssuerKey {
  const key = loadIssuerKey(cfg.issuerSeed);
  if (!key) {
    throw new ApiError(
      'engine_unavailable',
      'Credential issuance is disabled: FREEVERSE_ISSUER_KEY is missing or invalid (run "npm run issuer:keygen").',
    );
  }
  return key;
}

/**
 * Deterministic credential id.
 * Derived from the attempt nonce (server-minted, single-use) plus the signing
 * secret, so the same attempt always maps to the same id — that is what makes
 * issuance idempotent without a database.
 */
export function deriveCredentialId(cfg: ServerConfig, payload: ResultTokenPayload, issuedAtIso: string): string {
  const key = hkdf(cfg.signingSecret ?? '', 'credential-id');
  const digest = hmacHex(key, `rfv.credential.v1|${payload.n}|${payload.t}|${payload.l}`, 16);
  const year = new Date(issuedAtIso).getUTCFullYear();
  return `RFV-${year}-${digest.slice(0, 8).toUpperCase()}`;
}

export function buildRecord(args: {
  cfg: ServerConfig;
  payload: ResultTokenPayload;
  displayName: string;
  learnerRef: string;
  topicTitle: string;
  skills: { skillId: string; name: string }[];
  qualityStatus: string;
  itemPool: string;
  skillCoverage: { assessed: number; total: number };
  skillGaps: string[];
  issuedAtIso: string;
  credentialId: string;
  verifyUrl: string;
  issuerName: string;
  issuerUrl: string;
}): RegistryCredentialRecord {
  const level = LEVELS[args.payload.l as LevelId];
  return {
    schema: CREDENTIAL_SCHEMA,
    id: args.credentialId,
    status: 'valid',
    subject: { display_name: args.displayName, learner_ref: args.learnerRef },
    credential: {
      definition_id: `rfv.cred.${args.payload.t}.${args.payload.l}`,
      topic_id: args.payload.t,
      title: args.topicTitle,
      level: args.payload.l,
      level_label: level?.label ?? args.payload.l,
      skills: args.skills.map((s) => ({ skill_id: s.skillId, name: s.name })),
    },
    assessment: {
      method: CREDENTIAL_DISCLOSURE.method,
      question_count: args.payload.x,
      score: args.payload.s,
      passing_score: level?.passingScore ?? 80,
      bank_version: args.payload.bv,
      blueprint_id: args.payload.b,
      integrity_status: args.qualityStatus,
      item_pool: args.itemPool,
      skill_coverage: args.skillCoverage,
      skill_gaps: args.skillGaps,
    },
    issued_at: args.issuedAtIso,
    issuer: { name: args.issuerName, url: args.issuerUrl },
    verify_url: args.verifyUrl,
  };
}

export function signRecord(key: IssuerKey, record: RegistryCredentialRecord): RegistryCredentialRecord {
  const unsigned = { ...record } as unknown as Record<string, unknown>;
  delete unsigned.signature;
  const value = signEd25519(key, canonical(unsigned));
  return {
    ...record,
    signature: { alg: 'Ed25519', key_id: key.keyId, signed_fields: 'canonical-json-v1', value },
  };
}

export function recordVerifies(record: RegistryCredentialRecord, publicKeyPem: string): boolean {
  if (!record.signature?.value || record.signature.alg !== 'Ed25519') return false;
  const unsigned = { ...record } as unknown as Record<string, unknown>;
  delete unsigned.signature;
  return verifyEd25519(publicKeyPem, canonical(unsigned), record.signature.value);
}

/** Map a registry record to the public verification view. */
export function toPublicCredential(
  record: RegistryCredentialRecord,
  args: { registryPath: string; provenance: 'signed' | 'legacy-unsigned'; revocation: { revokedAt: string; reason: string } | null },
): PublicCredential {
  const level = LEVELS[record.credential?.level as LevelId];
  const legacy = record as unknown as LegacyCredentialRecord;

  // Pre-2.0 records carry quiz/recipient/score fields instead of the v2 shape.
  // They are mapped here so existing credentials keep working — but they are
  // flagged `legacy-unsigned` by the caller, so nothing about them is presented
  // as cryptographically verified.
  if (!record.credential && legacy.quiz) {
    return {
      schema: 'rfv.credential/2',
      id: record.id,
      status: args.revocation ? 'revoked' : 'valid',
      subject: {
        displayName: legacy.recipient?.name ?? 'Unknown',
        // Deliberately empty: the legacy email hash is not republished.
        learnerRef: '',
      },
      credential: {
        definitionId: `legacy:${legacy.quiz.id ?? 'unknown'}`,
        topicId: legacy.quiz.id ?? '',
        title: legacy.quiz.title ?? 'Unknown credential',
        level: 'foundation',
        levelLabel: 'Legacy (pre-levels)',
        skills: [],
      },
      assessment: {
        method: 'Legacy assessment (pre-2.0): client-side grading, no server record. Not comparable to current credentials.',
        questionCount: 0,
        score: typeof legacy.score === 'number' ? legacy.score : 0,
        passingScore: 80,
        bankVersion: legacy.quiz.version ?? 'legacy',
        blueprintId: 'legacy',
        skillCoverage: { assessed: 0, total: 0 },
        skillGaps: [],
      },
      issuedAt: legacy.issued_at ?? '',
      issuer: { name: legacy.issuer ?? CREDENTIAL_DISCLOSURE.issuer, url: '' },
      verifyUrl: legacy.verify_url ?? '',
      registryPath: args.registryPath,
      provenance: args.provenance,
      signature: null,
      revocation: args.revocation,
    };
  }

  return {
    schema: 'rfv.credential/2',
    id: record.id,
    status: args.revocation ? 'revoked' : (record.status ?? 'valid'),
    subject: {
      displayName: record.subject?.display_name ?? 'Unknown',
      learnerRef: record.subject?.learner_ref ?? '',
    },
    credential: {
      definitionId: record.credential?.definition_id ?? '',
      topicId: record.credential?.topic_id ?? '',
      title: record.credential?.title ?? 'Unknown credential',
      level: (record.credential?.level as LevelId) ?? 'foundation',
      levelLabel: record.credential?.level_label ?? level?.label ?? 'Foundation',
      skills: Array.isArray(record.credential?.skills)
        ? record.credential!.skills.map((s) => ({ skillId: s.skill_id, name: s.name }))
        : [],
    },
    assessment: {
      method: record.assessment?.method ?? CREDENTIAL_DISCLOSURE.method,
      questionCount: record.assessment?.question_count ?? 0,
      score: record.assessment?.score ?? 0,
      passingScore: record.assessment?.passing_score ?? level?.passingScore ?? 80,
      bankVersion: record.assessment?.bank_version ?? 'unknown',
      blueprintId: record.assessment?.blueprint_id ?? 'unknown',
      skillCoverage: {
        assessed: record.assessment?.skill_coverage?.assessed ?? (record.credential?.skills?.length ?? 0),
        total: record.assessment?.skill_coverage?.total ?? (record.credential?.skills?.length ?? 0),
      },
      skillGaps: Array.isArray(record.assessment?.skill_gaps) ? record.assessment.skill_gaps : [],
    },
    issuedAt: record.issued_at,
    issuer: { name: record.issuer?.name ?? CREDENTIAL_DISCLOSURE.issuer, url: record.issuer?.url ?? '' },
    verifyUrl: record.verify_url ?? '',
    registryPath: args.registryPath,
    provenance: args.provenance,
    signature: record.signature
      ? { alg: 'Ed25519', keyId: record.signature.key_id, value: record.signature.value }
      : null,
    revocation: args.revocation,
  };
}

export interface IssuanceOutcome {
  credential: PublicCredential;
  alreadyIssued: boolean;
  registryUrl: string;
}

/**
 * Idempotent issuance.
 * `createOnly` guarantees a credential file is never overwritten, so a replay
 * either returns the record that already exists or fails loudly — it can never
 * manufacture a second credential for the same attempt.
 */
export async function issueCredential(args: {
  cfg: ServerConfig;
  registry: Registry;
  payload: ResultTokenPayload;
  displayName: string;
  learnerRef: string;
  topicTitle: string;
  skills: { skillId: string; name: string }[];
  qualityStatus: string;
  itemPool: string;
  skillCoverage: { assessed: number; total: number };
  skillGaps: string[];
  issuerUrl: string;
}): Promise<IssuanceOutcome> {
  const { cfg, registry, payload } = args;

  if (!payload.ok) {
    throw new ApiError('not_passed', 'This attempt did not pass; no credential can be issued.');
  }
  if (payload.p !== 'result') throw new ApiError('invalid_result', 'That token is not a result.');

  const key = issuerKey(cfg);
  const issuedAtIso = new Date().toISOString();
  const credentialId = deriveCredentialId(cfg, payload, issuedAtIso);
  const registryPath = `certs/${new Date(issuedAtIso).getUTCFullYear()}/${String(new Date(issuedAtIso).getUTCMonth() + 1).padStart(2, '0')}/${credentialId}.json`;
  const verifyUrl = `${args.issuerUrl}/verify?id=${credentialId}`;

  const record = buildRecord({
    cfg,
    payload,
    displayName: args.displayName,
    learnerRef: args.learnerRef,
    topicTitle: args.topicTitle,
    skills: args.skills,
    qualityStatus: args.qualityStatus,
    itemPool: args.itemPool,
    skillCoverage: args.skillCoverage,
    skillGaps: args.skillGaps,
    issuedAtIso,
    credentialId,
    verifyUrl,
    issuerName: CREDENTIAL_DISCLOSURE.issuer,
    issuerUrl: args.issuerUrl,
  });

  const signed = signRecord(key, record);
  const write = await registry.createOnly(registryPath, `${JSON.stringify(signed, null, 2)}\n`, `feat(cert): issue ${credentialId} (${payload.t} · ${payload.l})`);

  // Publish the verification key once so third parties can verify offline.
  if (write.created) {
    try {
      await registry.publishIssuerKey(key.keyId, key.publicKeyPem);
    } catch (e) {
      // A missing public key file does not invalidate the credential, but it
      // does prevent independent offline verification — surface it in logs.
      logEvent('issuer_key_publish_failed', { keyId: key.keyId, name: e instanceof Error ? e.name : 'unknown' });
    }
    void registry
      .appendLearnerRecord(args.learnerRef, {
        credential: { topic: payload.t, level: payload.l, id: credentialId, issued_at: issuedAtIso, status: 'valid' },
      })
      .catch(() => false);
  }

  return {
    credential: toPublicCredential(signed, { registryPath, provenance: 'signed', revocation: null }),
    alreadyIssued: write.alreadyExisted,
    registryUrl: `https://github.com/${registry.publicSlug}/blob/${cfg.registry.branch}/${registryPath}`,
  };
}
