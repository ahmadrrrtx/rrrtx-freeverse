// ────────────────────────────────────────────────────────────
// RRRTX FreeVerse — API contracts shared by client and server.
//
// These types describe exactly what crosses the network. If a
// field is not listed here, the client must not depend on it.
// Answer keys, grading internals and signing material are
// deliberately absent — see SECURITY_AUDIT.md (P1-A).
// ────────────────────────────────────────────────────────────

import type { LevelId } from './levels';

export type { LevelId };

// ── Public catalog (no answers, no internal bank metadata) ──
export interface CatalogLevel {
  id: LevelId;
  label: string;
  short: string;
  available: boolean;
  /**
   * How many of the topic's skill areas this level's item pool actually covers.
   * When `assessed < total` the credential records which areas were examined —
   * the gap is published, never hidden.
   */
  skillCoverage: { assessed: number; total: number; minRequired: number };
  /** Present when available === false. Human-readable, no internals. */
  unavailableReason?: string;
  questionCount: number;
  passingScore: number;
  durationSec: number;
  requiresLevel: LevelId | null;
  demonstrates: string[];
  tagline: string;
}

export interface CatalogSkill {
  skillId: string;
  name: string;
  /** Number of items available for this skill across all levels. */
  items: number;
}

export interface CatalogTopic {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  skillId: string;
  estimatedMinutes: number;
  questionCount: number;
  levels: CatalogLevel[];
  skills: CatalogSkill[];
  quality: {
    /** Items that passed every automated quality check. */
    approved: number;
    /** Items queued for rewrite; still served at Foundation/Intermediate. */
    provisional: number;
    /** Items withheld from service entirely. */
    rejected: number;
    /** Share of items where "always pick the longest option" is correct (0-1). */
    longestOptionBaseline: number;
    /** Same measurement restricted to the items a level may actually serve. */
    servableBaseline: number;
    /** Same measurement restricted to items that passed every automated check. */
    approvedBaseline: number;
    /** true when the automated quality baseline still allows the above heuristic to pass alone. */
    lengthHeuristicRisk: boolean;
    /** Automated gate outcome for this topic's item bank. */
    assessmentIntegrity: 'verified' | 'under-review' | 'withheld';
    /** Counts of automated findings, by finding code. */
    findingsByCode?: Record<string, number>;
  };
}

export interface Catalog {
  schema: 'rfv.catalog/2';
  bankVersion: string;
  generatedAt: string;
  topics: CatalogTopic[];
}

// ── Integration surface (GET /api/catalog) ──
// Consumed by companion apps (LearnPath) and by verification widgets that need
// the catalog, the stable definition ids and the authoritative verify endpoint
// without scraping the UI. Public data only — never answers or recipients.

export interface IntegrationLevel {
  id: LevelId;
  /** Stable credential definition id: rfv.cred.<topic>.<level>. */
  definitionId: string;
  blueprintId: string | null;
  label: string;
  available: boolean;
  /** Published reason when `available` is false. Never an internal error. */
  unavailableReason: string | null;
  questionCount: number;
  passingScore: number;
  durationSec: number;
  requiresLevel: LevelId | null;
  skillCoverage: { assessed: number; total: number; minRequired: number } | null;
}

export interface IntegrationLearnpathSkillLink {
  freeverseSkillId: string;
  skillName: string;
  learnpathSkillId: string;
  learnpathSkillTitle: string | null;
  url: string;
}

export interface IntegrationLearnpath {
  unmappedReason: string | null;
  primaryRoadmap: string | null;
  primaryRoadmapTitle: string | null;
  primaryRoadmapUrl: string | null;
  entries: {
    roadmap: string;
    roadmapTitle: string | null;
    confidence: 'high' | 'medium';
    note: string;
    skills: { skillId: string; title: string; url: string }[];
  }[];
  skillLinks: IntegrationLearnpathSkillLink[];
}

export interface IntegrationTopic {
  id: string;
  title: string;
  category: string;
  skillId: string;
  estimatedMinutes: number;
  questionCount: number;
  skillAreaCount: number;
  levelCount: number;
  levels: IntegrationLevel[];
  quality: {
    assessmentIntegrity: 'verified' | 'under-review' | 'withheld';
    lengthHeuristicRisk: boolean;
    approved: number;
    provisional: number;
    rejected: number;
  };
  learnpath: IntegrationLearnpath;
}

export interface CatalogIntegrationResponse {
  schema: 'rfv.integration/1';
  bankVersion: string;
  generatedAt: string;
  checkedAt: string;
  origin: string;
  authoritative: {
    verification: string;
    verify: { method: 'GET'; path: string; query: Record<string, string>; urlTemplate: string };
    verifyStates: VerifyState[];
    credentialPath: string;
    registryRepo: string;
    issuerKeyPath: string;
  };
  endpoints: Record<string, { method: string; path: string; status?: string }>;
  disclosure: Record<string, string>;
  bank: {
    version: string;
    topics: number;
    items: number;
    underReviewTopics: number;
    productionSealed: boolean;
  };
  learnpath: {
    site: string;
    repo: string;
    ref: string;
    note: string;
    mappedTopics: number;
    unmappedTopics: number;
  };
  topics: IntegrationTopic[];
}

// ── Attempt lifecycle ──
export interface AttemptQuestion {
  /** Opaque per-attempt item reference. Not the bank question id. */
  ref: string;
  prompt: string;
  options: string[];
  /** Skill (sub-topic) this item maps to. Stable id + label. */
  skillId: string;
  skillName: string;
}

export interface StartAttemptRequest {
  topicId: string;
  level: LevelId;
  recipient: { displayName: string; email: string };
  /** Optional: a previously issued credential id used as prerequisite proof. */
  prerequisiteCredentialId?: string;
  /** Optional attribution: 'learnpath' | 'direct' | 'other'. */
  source?: string;
  /** Optional skill hint for LearnPath deep links (validated server-side). */
  skillId?: string;
}

export interface StartAttemptResponse {
  attemptToken: string;
  attemptId: string;
  topicId: string;
  topicTitle: string;
  level: LevelId;
  expiresAt: string;
  durationSec: number;
  passingScore: number;
  questions: AttemptQuestion[];
  /** Transparency: what this assessment can and cannot establish. */
  disclosure: { method: string; identity: string; integrity: string };
}

export type SubmitReason = 'submitted' | 'timeout' | 'violations' | 'abandoned';

export interface SubmitAttemptRequest {
  attemptToken: string;
  /** Index-aligned with AttemptQuestion[]; null = skipped. */
  answers: (number | null)[];
  reason: SubmitReason;
  /** Self-reported browser anti-cheat violations. Advisory only. */
  violations?: number;
  /** Client-measured elapsed seconds. Advisory only; the server uses its own clock. */
  clientElapsedSec?: number;
}

export interface SkillBreakdown {
  skillId: string;
  skillName: string;
  asked: number;
  correct: number;
}

export interface ReviewItem {
  ref: string;
  prompt: string;
  options: string[];
  /** null when the item was skipped and therefore not disclosed. */
  correctOption: number | null;
  chosenOption: number | null;
  correct: boolean;
  skillName: string;
  explanation: string | null;
}

export interface AttemptResult {
  schema: 'rfv.result/1';
  resultToken: string;
  topicId: string;
  level: LevelId;
  topicTitle: string;
  score: number;
  correctCount: number;
  totalCount: number;
  passed: boolean;
  passingScore: number;
  durationUsedSec: number;
  submittedAt: string;
  reason: SubmitReason;
  /** Server-observed integrity signals. Never client-declared. */
  integrity: {
    selfReportedViolations: number;
    reviewDisclosure: 'full' | 'aggregate-only';
  };
  breakdown: SkillBreakdown[];
  strengths: SkillBreakdown[];
  needsWork: SkillBreakdown[];
  review: ReviewItem[];
  recommendations: Recommendation[];
  retake: { eligible: boolean; nextAvailableAt: string | null; policy: string };
  credentialEligible: boolean;
}

export interface Recommendation {
  skillId: string;
  skillName: string;
  accuracy: number;
  /**
   * A verified "learn next" URL, or null when no honest link exists for this
   * skill area. Never a guessed URL: a dead link in a learning recommendation
   * is worse than plain text.
   */
  resourceUrl: string | null;
  /** Where the link goes, for the UI label. Null when resourceUrl is null. */
  resourceLabel: string | null;
}

// ── Credential issuance / verification ──
export interface IssueCredentialRequest {
  resultToken: string;
  /** Must match the identity bound to the attempt. */
  recipient: { displayName: string; email: string };
  /** Idempotency key. Clients echo the result token's attempt id. */
  idempotencyKey?: string;
}

export type CredentialStatus = 'valid' | 'revoked';

export interface PublicCredential {
  schema: 'rfv.credential/2';
  id: string;
  status: CredentialStatus;
  subject: { displayName: string; learnerRef: string };
  credential: {
    definitionId: string;
    topicId: string;
    title: string;
    level: LevelId;
    levelLabel: string;
    skills: { skillId: string; name: string }[];
  };
  assessment: {
    method: string;
    questionCount: number;
    score: number;
    passingScore: number;
    bankVersion: string;
    blueprintId: string;
    /** Skill areas the attempt actually covered. */
    skillCoverage: { assessed: number; total: number };
    /** Skill areas this level's pool could not cover (empty when complete). */
    skillGaps: string[];
  };
  issuedAt: string;
  issuer: { name: string; url: string };
  verifyUrl: string;
  registryPath: string;
  /** How the registry record was authenticated. */
  provenance: 'signed' | 'legacy-unsigned';
  signature: { alg: 'Ed25519'; keyId: string; value: string } | null;
  revocation: { revokedAt: string; reason: string } | null;
}

export interface IssueCredentialResponse {
  credential: PublicCredential;
  /** true when the record already existed (replay / retry). */
  alreadyIssued: boolean;
  registryUrl: string;
}

export type VerifyState =
  | 'valid'
  | 'revoked'
  | 'not-found'
  | 'invalid-id'
  | 'registry-unavailable'
  | 'unauthenticated-record';

export interface VerifyResponse {
  state: VerifyState;
  /** Machine-readable summary for the UI banner. */
  checkedAt: string;
  credential: PublicCredential | null;
  notes: string[];
}

// ── Errors ──
export type ApiErrorCode =
  | 'bad_request'
  | 'invalid_attempt'
  | 'attempt_expired'
  | 'attempt_already_used'
  | 'invalid_result'
  | 'not_passed'
  | 'prerequisite_missing'
  | 'cooldown_active'
  | 'rate_limited'
  | 'origin_rejected'
  | 'engine_unavailable'
  | 'registry_unavailable'
  | 'conflict'
  | 'not_implemented'
  | 'internal_error';

export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string; retryable: boolean; details?: Record<string, unknown> };
}
