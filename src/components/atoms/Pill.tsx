import { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

type PillTone = 'term' | 'fg' | 'warn' | 'err';

interface PillProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: PillTone;
  children: ReactNode;
  /** Show monospace bracket prefix `[01/15]` style */
  bracket?: boolean;
}

const toneStyles: Record<PillTone, string> = {
  term: 'bg-term-soft text-term-glow border-term-ring',
  fg:   'bg-bg-1 text-fg-2 border-bg-3',
  warn: 'bg-warn-500/10 text-warn-500 border-warn-500/30',
  err:  'bg-err-500/10 text-err-500 border-err-500/30',
};

/**
 * Small status/category indicator.
 * Sharp corners (terminal aesthetic), no rounded pills.
 */
export function Pill({ tone = 'term', bracket = false, className, children, ...rest }: PillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5',
        'border font-mono text-[11px] font-medium uppercase tracking-wider',
        toneStyles[tone],
        className,
      )}
      {...rest}
    >
      {bracket && <span className="opacity-60">[</span>}
      {children}
      {bracket && <span className="opacity-60">]</span>}
    </span>
  );
}
