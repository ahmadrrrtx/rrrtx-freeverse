// ────────────────────────────────────────────────────────────
// RRRTX FreeVerse — Shared TypeScript types
// ────────────────────────────────────────────────────────────

export interface Question {
  id: string;
  q: string;
  options: string[];
  answer: number;        // index into options
  explanation?: string;
}

export interface SubPool {
  topic: string;         // e.g. "What is a prompt"
  questions: Question[]; // 5 questions per sub-pool
}

export interface Quiz {
  id: string;            // e.g. "prompt-engineering"
  title: string;
  description: string;
  category: 'AI' | 'Web Dev' | 'Programming' | 'Data' | 'Career' | 'Design' | 'Security';
  icon: string;          // emoji
  estimatedMinutes: number;
  passingScore: number;  // e.g. 80
  questionsPerAttempt: number; // e.g. 20
  durationSec: number;   // e.g. 1200 (20 min)
  subPools: SubPool[];   // 20 sub-pools of 5 questions = 100 total
  version: string;       // e.g. "1.0"
}

// What the engine produces for a single attempt
export interface ShuffledQuestion {
  originalId: string;
  q: string;
  options: string[];
  correctOptionIndex: number;
  explanation?: string;
}

export interface QuizAttempt {
  quizId: string;
  startedAt: number;
  endsAt: number;
  questions: ShuffledQuestion[];
  answers: (number | null)[];
  violations: SecureModeViolation[];
}

export interface QuizResult {
  quizId: string;
  score: number;
  correctCount: number;
  totalCount: number;
  passed: boolean;
  submittedAt: string;
  durationUsedSec: number;
  violationCount: number;
  forceSubmitted: boolean;
  forceSubmitReason?: string;
}

export interface UserProfile {
  name: string;
  email: string;
  username?: string;
}

export interface Certificate {
  id: string;
  recipient: { name: string; email_hash: string };
  quiz: { id: string; title: string; version: string };
  score: number;
  issued_at: string;
  issuer: 'RRRTX FreeVerse';
  verify_url: string;
  integrity: {
    violations: number;
    completed_in_secure_mode: boolean;
  };
}

// ── Secure Mode (HackerRank-style anti-cheat) ──────────────
export type ViolationType =
  | 'tab_switch'         // user switched tab or minimized
  | 'fullscreen_exit'    // user exited fullscreen
  | 'copy_attempt'       // user tried to copy
  | 'paste_attempt'      // user tried to paste
  | 'right_click'        // user opened context menu
  | 'devtools_open'      // dev tools detected
  | 'shortcut_blocked'   // dangerous shortcut intercepted
  | 'multi_monitor';     // multiple displays detected

export interface SecureModeViolation {
  type: ViolationType;
  timestamp: number;
  details?: string;
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
