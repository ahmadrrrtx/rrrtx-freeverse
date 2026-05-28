import { type ReactNode } from 'react';
import { cn } from '../../lib/cn';

/**
 * Section label — uppercase monospace metadata line.
 * Used at the top of every major content section.
 * Example: `// how-it-works`
 */
export function SectionLabel({
  children,
  className,
}: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'font-mono text-xs uppercase tracking-widest text-fg-4',
        className,
      )}
    >
      <span aria-hidden="true" className="text-fg-5">// </span>
      {children}
    </div>
  );
}

/**
 * Section heading — Satoshi Black, 40-72px responsive.
 * Used immediately after SectionLabel.
 */
export function SectionHeading({
  children,
  className,
}: { children: ReactNode; className?: string }) {
  return (
    <h2
      className={cn(
        'mt-4 font-display font-black text-fg-0',
        'text-[2.25rem] leading-[1.05] tracking-[-0.035em]',
        'sm:text-[3rem] sm:leading-[1]',
        'lg:text-[3.75rem] lg:tracking-[-0.04em]',
        'max-w-[40rem]',
        className,
      )}
    >
      {children}
    </h2>
  );
}

/**
 * Section sub-description below a heading.
 */
export function SectionSub({
  children,
  className,
}: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        'mt-4 font-mono text-sm sm:text-base text-fg-3 leading-relaxed',
        'max-w-[34rem]',
        className,
      )}
    >
      {children}
    </p>
  );
}
