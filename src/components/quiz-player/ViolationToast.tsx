import { useEffect, useState } from 'react';
import { cn } from '../../lib/cn';
import type { SecureModeViolation } from '../../types';

interface ViolationToastProps {
  violation: SecureModeViolation | null;
  remaining: number;
  /** Optional callback fired when toast finishes auto-dismissing */
  onDismiss?: () => void;
}

/**
 * Floating warning toast that slides in from top when secure mode catches a violation.
 * Auto-dismisses after 5 seconds.
 */
export function ViolationToast({ violation, remaining, onDismiss }: ViolationToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!violation) return;
    setVisible(true);
    const t = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, 5000);
    return () => clearTimeout(t);
  }, [violation, onDismiss]);

  if (!violation) return null;

  const message = (() => {
    switch (violation.type) {
      case 'tab_switch':       return 'Tab switch or window minimize detected.';
      case 'fullscreen_exit':  return 'Fullscreen exit detected.';
      case 'copy_attempt':     return 'Copy attempt blocked.';
      case 'paste_attempt':    return 'Paste attempt blocked.';
      case 'right_click':      return 'Right-click blocked.';
      case 'devtools_open':    return 'Developer tools opened.';
      case 'shortcut_blocked': return `Blocked shortcut: ${violation.details ?? 'unknown'}.`;
      case 'multi_monitor':    return 'Additional monitor detected.';
      default:                 return 'Integrity violation detected.';
    }
  })();

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'fixed top-20 sm:top-24 left-1/2 -translate-x-1/2 z-[70]',
        'w-[min(92vw,28rem)]',
        'border border-warn-500/50 bg-bg-1',
        'shadow-card',
        'transition-all duration-fast ease-out-expo',
        visible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 -translate-y-4 pointer-events-none',
      )}
    >
      <div className="flex items-start gap-3 p-4">
        <span
          aria-hidden="true"
          className="
            shrink-0 mt-0.5
            font-mono font-bold text-warn-500 text-base
          "
        >
          !
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-mono text-sm text-warn-500 font-medium leading-snug">
            warning · {remaining} {remaining === 1 ? 'chance' : 'chances'} remaining
          </p>
          <p className="mt-1 font-mono text-xs text-fg-2 leading-relaxed">
            {message}
          </p>
        </div>
      </div>
      {/* Progress strip — fades out as toast auto-dismisses */}
      <div className="h-0.5 bg-warn-500 origin-left animate-[toast-bar_5s_linear_forwards]" />
      <style>{`
        @keyframes toast-bar {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }
      `}</style>
    </div>
  );
}
