import { cn } from '../../lib/cn';

interface StatusDotProps {
  /** 'online' = pulsing green. 'idle' = static gray. 'error' = red. */
  state?: 'online' | 'idle' | 'error';
  className?: string;
}

/**
 * The pulsing terminal-green status dot.
 * Signals "this is alive" — used in the status bar, secure mode indicator, etc.
 */
export function StatusDot({ state = 'online', className }: StatusDotProps) {
  const stateStyles = {
    online: 'bg-term-glow shadow-glow-term animate-pulse-term',
    idle:   'bg-fg-4',
    error:  'bg-err-500',
  };
  return (
    <span
      role="status"
      aria-label={`Status: ${state}`}
      className={cn(
        'inline-block h-1.5 w-1.5 rounded-full',
        stateStyles[state],
        className,
      )}
    />
  );
}
