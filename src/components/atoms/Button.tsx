import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'ghost' | 'link' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  full?: boolean;
  /** Show `$` prefix on primary (terminal command feel) */
  cmd?: boolean;
}

const baseStyles =
  'inline-flex items-center justify-center gap-2.5 font-mono font-medium ' +
  'transition-all duration-fast ease-out-expo ' +
  'focus-visible:outline-none disabled:opacity-40 disabled:cursor-not-allowed ' +
  'select-none whitespace-nowrap rounded-none';

const variantStyles: Record<Variant, string> = {
  // Brutalist primary — solid green with offset shadow.
  // Hover translates the button toward the shadow.
  primary:
    'bg-term-glow text-bg-0 font-bold ' +
    '[box-shadow:4px_4px_0_theme(colors.term.deep)] ' +
    'hover:translate-x-[-2px] hover:translate-y-[-2px] ' +
    'hover:[box-shadow:6px_6px_0_theme(colors.term.deep)] ' +
    'active:translate-x-0 active:translate-y-0 active:[box-shadow:2px_2px_0_theme(colors.term.deep)] ' +
    'motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0',
  ghost:
    'bg-transparent text-fg-1 border border-bg-3 ' +
    'hover:border-fg-1 hover:bg-bg-1',
  link:
    'bg-transparent text-term-glow underline-offset-4 hover:underline px-0',
  danger:
    'bg-transparent text-err-500 border border-err-500/40 ' +
    'hover:border-err-500 hover:bg-err-500/10',
};

const sizeStyles: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-xs',
  md: 'h-11 px-5 text-sm',
  lg: 'h-13 px-6 text-sm', // sized for the hero
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon,
    rightIcon,
    full = false,
    cmd = false,
    className,
    children,
    disabled,
    ...rest
  },
  ref,
) {
  const showCmdPrefix = cmd && variant === 'primary';
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        full && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <Spinner />
      ) : (
        <>
          {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
          {showCmdPrefix && <span aria-hidden="true">$</span>}
          <span>{children}</span>
          {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
});

function Spinner() {
  return (
    <span
      role="status"
      aria-label="Loading"
      className="inline-block h-4 w-4 animate-spin border-2 border-current border-t-transparent"
    />
  );
}
