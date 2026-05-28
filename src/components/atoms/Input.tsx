import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: ReactNode;
  error?: string;
  /** Show a monospace prefix inside the input (e.g. `$ `) */
  prefix?: string;
}

/**
 * Terminal-styled input.
 * - Sharp corners, hairline border
 * - Label above (not floating)
 * - Mono font everywhere — matches terminal aesthetic
 * - Focus: terminal-green border + glow
 * - Error: red border + error message below
 * - Mobile: minimum 48px height for touch
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, prefix, className, id, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={inputId}
        className="
          font-mono text-[11px] uppercase tracking-widest text-fg-3
        "
      >
        {label}
      </label>

      <div
        className={cn(
          'relative flex items-stretch',
          'border bg-bg-1 transition-colors duration-snap',
          error
            ? 'border-err-500'
            : 'border-bg-3 focus-within:border-term-glow focus-within:bg-bg-0',
        )}
      >
        {prefix && (
          <span className="
            flex items-center pl-3.5 pr-1
            font-mono text-sm text-term-glow font-medium
            select-none
          ">
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={cn(hint && hintId, error && errorId)}
          className={cn(
            'w-full bg-transparent',
            'min-h-[48px] px-3.5 py-2',
            'font-mono text-sm text-fg-0 placeholder:text-fg-5',
            'outline-none focus:outline-none',
            'autofill:!bg-transparent',
            prefix && 'pl-1',
            className,
          )}
          {...rest}
        />
      </div>

      {(hint || error) && (
        <p
          id={error ? errorId : hintId}
          className={cn(
            'font-mono text-xs',
            error ? 'text-err-500' : 'text-fg-4',
          )}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
});
