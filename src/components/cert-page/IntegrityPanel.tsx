import { type ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface IntegrityRowProps {
  label: string;
  value: ReactNode;
  emphasized?: boolean;
}

interface IntegrityPanelProps {
  rows: IntegrityRowProps[];
  /** Optional title shown above the panel */
  title?: string;
  /** Optional source link below the rows */
  sourceLink?: { href: string; label: string };
}

/**
 * IntegrityPanel — labeled key/value display for cert metadata.
 * Used on both /cert/:id (full details) and /verify (lookup result).
 *
 * Each row: monospace label (uppercase tracked) | value (sans, bold).
 * Hairline divider between rows.
 */
export function IntegrityPanel({ rows, title, sourceLink }: IntegrityPanelProps) {
  return (
    <div className="border border-bg-3 bg-bg-1">
      {title && (
        <div className="
          font-mono text-[11px] uppercase tracking-widest text-fg-4
          border-b border-bg-3
          px-5 sm:px-6 py-3.5
        ">
          <span className="text-fg-5">// </span>{title}
        </div>
      )}

      <dl className="divide-y divide-bg-3">
        {rows.map((row) => (
          <div
            key={row.label}
            className="
              grid grid-cols-[120px_1fr] sm:grid-cols-[180px_1fr]
              gap-4 sm:gap-6
              px-5 sm:px-6 py-3.5 sm:py-4
              items-baseline
            "
          >
            <dt className="
              font-mono text-[11px] uppercase tracking-widest text-fg-4
            ">
              {row.label}
            </dt>
            <dd className={cn(
              'font-mono text-sm leading-relaxed min-w-0',
              row.emphasized ? 'text-term-glow font-medium' : 'text-fg-1',
            )}>
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      {sourceLink && (
        <div className="border-t border-bg-3 px-5 sm:px-6 py-3.5">
          <a
            href={sourceLink.href}
            target="_blank"
            rel="noreferrer noopener"
            className="
              inline-flex items-center gap-2
              font-mono text-xs text-fg-3 hover:text-term-glow
              transition-colors duration-snap
            "
          >
            <span aria-hidden="true">→</span>
            {sourceLink.label}
          </a>
        </div>
      )}
    </div>
  );
}
