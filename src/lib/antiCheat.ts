// ────────────────────────────────────────────────────────────
// RRRTX FreeVerse — Anti-cheat module (DEPRECATED)
//
// This module has been REPLACED by the more comprehensive
// HackerRank-style Secure Mode in `src/lib/secureMode.ts`.
//
// Kept here as a re-export shim so older imports don't break.
// New code should import from `./secureMode` directly.
// ────────────────────────────────────────────────────────────

export {
  createSecureMode,
  requestFullscreen,
  exitFullscreen,
  isFullscreenActive,
  DEFAULT_SECURE_CONFIG,
} from './secureMode';

export type {
  SecureModeConfig,
  SecureModeHandlers,
  SecureModeController,
} from './secureMode';
