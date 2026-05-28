// ────────────────────────────────────────────────────────────
// RRRTX FreeVerse — Secure Mode (HackerRank-style anti-cheat)
// ────────────────────────────────────────────────────────────
//
// WHAT THIS IS
//   A browser-only lockdown system modeled on HackerRank's
//   "Secure Mode" (NOT their AI Proctor mode, which requires
//   webcam/screen recording).
//
// WHAT IT DOES
//   1. Forces fullscreen on quiz start (Fullscreen API).
//   2. Detects tab switches / window blur / app switches.
//   3. Detects fullscreen exit attempts.
//   4. Blocks copy / paste / cut / right-click / text selection.
//   5. Blocks dangerous keyboard shortcuts:
//        - Cmd/Ctrl+T (new tab)
//        - Cmd/Ctrl+W (close tab)
//        - Cmd/Ctrl+N (new window)
//        - Cmd/Ctrl+R / F5 (reload)
//        - F12 / Cmd+Opt+I (dev tools)
//        - PrtScr (best-effort; OS-level can't be blocked)
//   6. Detects dev tools opening (window-size delta heuristic).
//   7. Warns about beforeunload (close tab / navigate away).
//   8. Logs every violation with timestamp.
//   9. After N violations, auto-submits the quiz.
//
// WHAT IT CANNOT DO (be honest with the user)
//   - Truly prevent Cmd+Tab / Alt+Tab at the OS level.
//   - Stop a Chrome extension like "Always Active Window".
//   - Detect a second device / monitor / phone next to the user.
//   - Block screen recording at the OS level.
//   - Force the user to stay in fullscreen forever (browsers
//     allow ESC to exit fullscreen — that's a hard security
//     guarantee no website can override).
//
//   THIS IS EXACTLY THE SAME LIMITATION HACKERRANK SECURE MODE
//   HAS. They detect + warn + log + auto-submit. So do we.
// ────────────────────────────────────────────────────────────

import type { SecureModeViolation, ViolationType } from '../types';

export interface SecureModeConfig {
  maxViolations: number;          // e.g. 3 → auto-submit after 3rd
  blockCopy: boolean;
  blockPaste: boolean;
  blockRightClick: boolean;
  blockTextSelection: boolean;
  blockShortcuts: boolean;
  detectDevTools: boolean;
  requireFullscreen: boolean;
}

export const DEFAULT_SECURE_CONFIG: SecureModeConfig = {
  maxViolations: 3,
  blockCopy: true,
  blockPaste: true,
  blockRightClick: true,
  blockTextSelection: true,
  blockShortcuts: true,
  detectDevTools: true,
  requireFullscreen: true,
};

export interface SecureModeHandlers {
  onViolation: (v: SecureModeViolation, totalCount: number) => void;
  onWarning: (message: string, remainingChances: number) => void;
  onForceSubmit: (reason: string) => void;
  onFullscreenChange: (isFullscreen: boolean) => void;
}

export interface SecureModeController {
  start: () => Promise<void>;
  stop: () => void;
  getViolations: () => SecureModeViolation[];
  forceFullscreen: () => Promise<void>;
}

/**
 * Attempt to enter fullscreen mode on the given element (defaults to <html>).
 * Returns true if successful, false if browser blocked it.
 * Must be called from a user-gesture handler (button click), or it will fail.
 */
export async function requestFullscreen(el?: HTMLElement): Promise<boolean> {
  const target = el ?? document.documentElement;
  try {
    if (target.requestFullscreen) {
      await target.requestFullscreen({ navigationUI: 'hide' });
    } else if ((target as any).webkitRequestFullscreen) {
      await (target as any).webkitRequestFullscreen();
    } else if ((target as any).msRequestFullscreen) {
      await (target as any).msRequestFullscreen();
    } else {
      return false;
    }
    return !!document.fullscreenElement;
  } catch (e) {
    console.warn('[SecureMode] fullscreen failed', e);
    return false;
  }
}

export function exitFullscreen(): Promise<void> {
  if (document.exitFullscreen) return document.exitFullscreen();
  if ((document as any).webkitExitFullscreen) return (document as any).webkitExitFullscreen();
  if ((document as any).msExitFullscreen) return (document as any).msExitFullscreen();
  return Promise.resolve();
}

export function isFullscreenActive(): boolean {
  return !!(
    document.fullscreenElement ||
    (document as any).webkitFullscreenElement ||
    (document as any).msFullscreenElement
  );
}

/**
 * Build a Secure Mode controller and install all event listeners.
 * Call `start()` AFTER the user clicks "Begin Quiz" (user-gesture required for fullscreen).
 */
export function createSecureMode(
  handlers: SecureModeHandlers,
  cfg: Partial<SecureModeConfig> = {},
): SecureModeController {
  const config = { ...DEFAULT_SECURE_CONFIG, ...cfg };
  const violations: SecureModeViolation[] = [];
  let active = false;
  let devToolsCheckInterval: number | null = null;

  // ── Violation recording ─────────────────────────────────────
  function recordViolation(type: ViolationType, details?: string) {
    if (!active) return;
    const v: SecureModeViolation = { type, timestamp: Date.now(), details };
    violations.push(v);
    handlers.onViolation(v, violations.length);

    const remaining = config.maxViolations - violations.length;
    if (remaining > 0) {
      handlers.onWarning(
        `Warning: ${prettyType(type)} detected. ${remaining} chance${remaining === 1 ? '' : 's'} remaining before auto-submit.`,
        remaining,
      );
    } else {
      handlers.onForceSubmit(`Exceeded ${config.maxViolations} security violations`);
    }
  }

  function prettyType(t: ViolationType): string {
    switch (t) {
      case 'tab_switch':      return 'Tab switch or window minimize';
      case 'fullscreen_exit': return 'Fullscreen exit';
      case 'copy_attempt':    return 'Copy attempt';
      case 'paste_attempt':   return 'Paste attempt';
      case 'right_click':     return 'Right-click';
      case 'devtools_open':   return 'Developer tools opened';
      case 'shortcut_blocked':return 'Blocked keyboard shortcut';
      case 'multi_monitor':   return 'Multiple monitors detected';
    }
  }

  // ── Tab switch / window blur detection ──────────────────────
  function onVisibilityChange() {
    if (document.hidden) {
      recordViolation('tab_switch', 'document.hidden=true');
    }
  }
  function onWindowBlur() {
    // window.blur fires when user Cmd+Tab to another app
    recordViolation('tab_switch', 'window blur');
  }

  // ── Fullscreen exit detection ───────────────────────────────
  function onFullscreenChange() {
    const fs = isFullscreenActive();
    handlers.onFullscreenChange(fs);
    if (config.requireFullscreen && !fs && active) {
      recordViolation('fullscreen_exit', 'fullscreenElement=null');
    }
  }

  // ── Copy / paste / right-click ──────────────────────────────
  function onCopy(e: ClipboardEvent) {
    if (config.blockCopy) {
      e.preventDefault();
      recordViolation('copy_attempt');
    }
  }
  function onCut(e: ClipboardEvent) {
    if (config.blockCopy) {
      e.preventDefault();
      recordViolation('copy_attempt', 'cut');
    }
  }
  function onPaste(e: ClipboardEvent) {
    if (config.blockPaste) {
      e.preventDefault();
      recordViolation('paste_attempt');
    }
  }
  function onContextMenu(e: MouseEvent) {
    if (config.blockRightClick) {
      e.preventDefault();
      recordViolation('right_click');
    }
  }
  function onSelectStart(e: Event) {
    if (config.blockTextSelection) {
      // Allow selection within inputs/textareas so users can use answer fields
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) {
        return;
      }
      e.preventDefault();
    }
  }

  // ── Keyboard shortcut blocking ──────────────────────────────
  function onKeyDown(e: KeyboardEvent) {
    if (!config.blockShortcuts) return;

    const meta = e.metaKey || e.ctrlKey;
    const key = e.key.toLowerCase();

    // Dev tools
    if (e.key === 'F12') {
      e.preventDefault();
      recordViolation('shortcut_blocked', 'F12');
      return;
    }
    if (meta && e.shiftKey && (key === 'i' || key === 'j' || key === 'c')) {
      e.preventDefault();
      recordViolation('shortcut_blocked', `${meta ? 'Cmd/Ctrl+' : ''}Shift+${e.key}`);
      return;
    }

    // Reload
    if ((meta && key === 'r') || e.key === 'F5') {
      e.preventDefault();
      recordViolation('shortcut_blocked', 'reload');
      return;
    }

    // New tab / new window / close tab
    if (meta && (key === 't' || key === 'n' || key === 'w')) {
      // browsers often won't let us block these, but we record the attempt
      recordViolation('shortcut_blocked', `Cmd/Ctrl+${e.key.toUpperCase()}`);
      // Don't preventDefault for Cmd+W since browser handles it natively at OS level
      return;
    }

    // Print screen (best-effort; OS handles it)
    if (e.key === 'PrintScreen') {
      recordViolation('shortcut_blocked', 'PrintScreen');
      return;
    }

    // View source
    if (meta && key === 'u') {
      e.preventDefault();
      recordViolation('shortcut_blocked', 'view-source');
    }
  }

  // ── Dev tools detection (window-size heuristic) ─────────────
  // When dev tools open as a docked panel, the inner vs outer
  // window dimensions differ by more than the OS chrome amount.
  function checkDevTools() {
    const threshold = 160;
    const widthDelta = window.outerWidth - window.innerWidth;
    const heightDelta = window.outerHeight - window.innerHeight;
    if (widthDelta > threshold || heightDelta > threshold) {
      recordViolation('devtools_open', `wΔ=${widthDelta}, hΔ=${heightDelta}`);
    }
  }

  // ── beforeunload warning ────────────────────────────────────
  function onBeforeUnload(e: BeforeUnloadEvent) {
    if (active) {
      e.preventDefault();
      e.returnValue = 'Your quiz is in progress. Leaving will auto-submit it.';
      return e.returnValue;
    }
  }

  // ── Start / stop ────────────────────────────────────────────
  async function start() {
    if (active) return;
    active = true;
    violations.length = 0;

    // Listeners
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onWindowBlur);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange as EventListener);
    document.addEventListener('copy', onCopy as EventListener);
    document.addEventListener('cut', onCut as EventListener);
    document.addEventListener('paste', onPaste as EventListener);
    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('selectstart', onSelectStart);
    document.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('beforeunload', onBeforeUnload);

    if (config.requireFullscreen) {
      await requestFullscreen();
    }

    if (config.detectDevTools) {
      devToolsCheckInterval = window.setInterval(checkDevTools, 1500);
    }
  }

  function stop() {
    if (!active) return;
    active = false;

    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('blur', onWindowBlur);
    document.removeEventListener('fullscreenchange', onFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', onFullscreenChange as EventListener);
    document.removeEventListener('copy', onCopy as EventListener);
    document.removeEventListener('cut', onCut as EventListener);
    document.removeEventListener('paste', onPaste as EventListener);
    document.removeEventListener('contextmenu', onContextMenu);
    document.removeEventListener('selectstart', onSelectStart);
    document.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('beforeunload', onBeforeUnload);

    if (devToolsCheckInterval !== null) {
      clearInterval(devToolsCheckInterval);
      devToolsCheckInterval = null;
    }

    // Best-effort exit fullscreen
    if (isFullscreenActive()) {
      exitFullscreen().catch(() => {});
    }
  }

  return {
    start,
    stop,
    getViolations: () => [...violations],
    forceFullscreen: () => requestFullscreen().then(() => {}),
  };
}
