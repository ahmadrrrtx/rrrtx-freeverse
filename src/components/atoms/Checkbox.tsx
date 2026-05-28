import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode;
  description?: ReactNode;
}

/**
 * Terminal-styled checkbox.
 * - Sharp square (matches no-radius aesthetic)
 * - Checked state: solid term-glow with black ✓
 * - Large 24px touch target box, clickable label
 * - Mobile: full row tappable
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, description, className, id, checked, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <label
      htmlFor={inputId}
      className={cn(
        'group flex items-start gap-3 cursor-pointer select-none',
        'p-3 -m-3 rounded-none',
        'transition-colors duration-snap',
        'hover:bg-bg-1',
        className,
      )}
    >
      <span className="relative flex shrink-0 items-center justify-center mt-0.5">
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          checked={checked}
          className="
            peer absolute h-6 w-6 cursor-pointer opacity-0
            focus-visible:outline-none
          "
          {...rest}
        />
        <span
          aria-hidden="true"
          className={cn(
            'flex h-6 w-6 items-center justify-center',
            'border transition-all duration-snap',
            checked
              ? 'border-term-glow bg-term-glow'
              : 'border-bg-3 bg-bg-1 group-hover:border-fg-3',
            'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-term-glow peer-focus-visible:outline-offset-2',
          )}
        >
          {checked && (
            <svg
              viewBox="0 0 12 12"
              className="h-3.5 w-3.5 text-bg-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="square"
              strokeLinejoin="miter"
            >
              <path d="M2.5 6.5L5 9L9.5 3.5" />
            </svg>
          )}
        </span>
      </span>

      <span className="flex flex-col gap-1 min-w-0">
        <span className="font-mono text-sm text-fg-1 leading-relaxed">{label}</span>
        {description && (
          <span className="font-mono text-xs text-fg-4 leading-relaxed">
            {description}
          </span>
        )}
      </span>
    </label>
  );
});
