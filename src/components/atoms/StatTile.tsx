import { type ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface StatTileProps {
  label: string;
  value: ReactNode;
  /** Highlight the value in terminal green */
  emphasized?: boolean;
}

/**
 * Single stat cell used inside a tiled StatBoard.
 * Compact, terminal-styled. Value on top, mono label below.
 * The parent grid creates the 1px hairline borders between cells.
 */
export function StatTile({ label, value, emphasized = false }: StatTileProps) {
  return (
    <div className="flex flex-col gap-1.5 bg-bg-0 p-4 sm:p-5">
      <span
        className={cn(
          'font-display font-black leading-none tracking-[-0.025em]',
          'text-[1.75rem] sm:text-[2rem] lg:text-[2.25rem]',
          emphasized ? 'text-term-glow' : 'text-fg-0',
        )}
      >
        {value}
      </span>
      <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-widest text-fg-4">
        {label}
      </span>
    </div>
  );
}
