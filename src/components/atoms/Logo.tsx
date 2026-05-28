import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn';

interface LogoProps {
  className?: string;
  asLink?: boolean;
  /** Show the blinking terminal cursor */
  withCursor?: boolean;
  /** Hide the leading `~` prefix */
  bare?: boolean;
}

/**
 * The RRRTX FreeVerse wordmark.
 * Terminal aesthetic: `~rrrtx_freeverse_` with optional blinking cursor.
 * The `~` is the home-directory tilde from terminal prompts.
 */
export function Logo({ className, asLink = true, withCursor = true, bare = false }: LogoProps) {
  const content = (
    <span
      className={cn(
        'inline-flex items-baseline font-mono font-semibold text-sm sm:text-[15px]',
        'tracking-tight text-fg-0',
        'transition-colors duration-snap hover:text-white',
        className,
      )}
    >
      {!bare && (
        <span className="text-term-glow font-bold mr-1" aria-hidden="true">~</span>
      )}
      <span>rrrtx_freeverse</span>
      {withCursor && (
        <span
          className="text-term-glow font-bold ml-0.5 animate-blink"
          aria-hidden="true"
        >
          _
        </span>
      )}
    </span>
  );

  if (asLink) {
    return (
      <Link to="/" aria-label="RRRTX FreeVerse — Home" className="inline-flex">
        {content}
      </Link>
    );
  }
  return content;
}
