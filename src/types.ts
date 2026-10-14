// ────────────────────────────────────────────────────────────
// RRRTX FreeVerse — client types
//
// Network contracts live in shared/contracts.ts so the client and
// the server cannot drift apart. Types kept here are either local
// UI state or *legacy* shapes still found in learners' browsers
// from before server-authoritative issuance.
// ────────────────────────────────────────────────────────────

export type {
  ApiErrorBody,
  ApiErrorCode,
  AttemptQuestion,
  AttemptResult,
  Catalog,
  CatalogLevel,
  CatalogSkill,
  CatalogTopic,
  CredentialStatus,
  IssueCredentialRequest,
  IssueCredentialResponse,
  PublicCredential,
  Recommendation,
  ReviewItem,
  SkillBreakdown,
  StartAttemptRequest,
  StartAttemptResponse,
  SubmitAttemptRequest,
  SubmitReason,
  VerifyResponse,
  VerifyState,
} from '../shared/contracts';

export type { LevelId, LevelSpec } from '../shared/levels';

export interface UserProfile {
  name: string;
  email: string;
  /** Set when the learner arrives from LearnPath; used only for attribution. */
  source?: string;
}

// ── Secure Mode (browser anti-tampering signals) ────────────
// These are ADVISORY ONLY. They are recorded as self-reported
// signals; grading and pass/fail never depend on them, because a
// client can always lie about them.
export type ViolationType =
  | 'tab_switch'
  | 'fullscreen_exit'
  | 'copy_attempt'
  | 'paste_attempt'
  | 'right_click'
  | 'devtools_open'
  | 'shortcut_blocked'
  | 'multi_monitor';

export interface SecureModeViolation {
  type: ViolationType;
  timestamp: number;
  details?: string;
}

// ── Legacy local shapes (pre-2.0 browsers) ──────────────────
// Only ever used to *display* what a learner already has on their
// device. Legacy records are never treated as verified: the server
// and the registry decide validity.
export interface LegacyCertificate {
  id: string;
  recipient: { name: string; email_hash?: string };
  quiz: { id: string; title: string; version?: string };
  score: number;
  issued_at: string;
  issuer?: string;
  verify_url?: string;
  integrity?: { violations?: number; completed_in_secure_mode?: boolean };
}

export interface LegacyQuizResult {
  quizId: string;
  score: number;
  correctCount: number;
  totalCount: number;
  passed: boolean;
  submittedAt: string;
  durationUsedSec?: number;
  violationCount?: number;
  forceSubmitted?: boolean;
}

export interface QuizMeta {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  estimatedMinutes: number;
  totalQuestions: number;
  perAttempt: number;
}
