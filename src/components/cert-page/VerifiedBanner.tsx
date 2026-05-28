import { type ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface VerifiedBannerProps {
  state: 'authentic' | 'unverified' | 'pending';
  children?: ReactNode;
}

/**
 * VerifiedBanner — the prominent trust signal at top of cert/verify pages.
 *
 * States:
 *   - authentic   (green) → "✓ Authentic certificate"
 *   - unverified  (red)   → "✗ Could not verify"
 *   - pending     (warn)  → "⟳ Verifying..."
 */
export function VerifiedBanner({ state, children }: VerifiedBannerProps) {
  const palette = {
    authentic: {
      bg: 'bg-term-soft',
      border: 'border-term-glow/40',
      text: 'text-term-glow',
      icon: '✓',
      label: 'AUTHENTIC CERTIFICATE',
    },
    unverified: {
      bg: 'bg-err-500/10',
      border: 'border-err-500/40',
      text: 'text-err-500',
      icon: '✗',
      label: 'COULD NOT VERIFY',
    },
    pending: {
      bg: 'bg-warn-500/10',
      border: 'border-warn-500/40',
      text: 'text-warn-500',
      icon: '⟳',
      label: 'VERIFYING...',
    },
  }[state];

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'border',
        palette.bg,
        palette.border,
        'flex flex-col sm:flex-row sm:items-center sm:justify-between',
        'gap-3 sm:gap-6',
        'p-4 sm:p-5',
      )}
    >
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <span
          aria-hidden="true"
          className={cn(
            'shrink-0 inline-flex items-center justify-center',
            'h-8 w-8 sm:h-10 sm:w-10',
            'font-mono font-bold text-base sm:text-lg',
            'border',
            palette.text,
            palette.border,
          )}
        >
          {palette.icon}
        </span>
        <div className="min-w-0">
          <div
            className={cn(
              'font-mono font-medium uppercase tracking-widest',
              'text-xs sm:text-sm',
              palette.text,
            )}
          >
            {palette.label}
          </div>
          {children && (
            <div className="mt-1 font-mono text-xs sm:text-sm text-fg-2 leading-relaxed">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
