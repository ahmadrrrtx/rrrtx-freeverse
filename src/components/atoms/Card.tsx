import { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  children: ReactNode;
}

/**
 * Base card surface.
 * Terminal-style: sharp corners, hairline borders, no rounded radius.
 * Interactive variant: subtle background shift on hover (no scale, no shadow).
 * Cards used in tiled grids should rely on the GRID for borders (1px gaps)
 * rather than each card carrying its own — see the QuizGrid component.
 */
export function Card({ interactive = false, className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'bg-bg-0 border border-bg-3',
        'transition-colors duration-fast ease-out-expo',
        interactive && 'cursor-pointer hover:bg-bg-1',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
