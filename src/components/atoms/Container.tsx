import { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

type ContainerSize = 'prose' | 'app' | 'marketing';

interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  size?: ContainerSize;
  children: ReactNode;
}

const sizeStyles: Record<ContainerSize, string> = {
  prose:      'max-w-prose',
  app:        'max-w-app',
  marketing:  'max-w-marketing',
};

/**
 * Centered responsive container.
 * Mobile (16px) → tablet (24px) → desktop (48px).
 * Wider than before to give the editorial feel breathing room.
 */
export function Container({ size = 'marketing', className, children, ...rest }: ContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-4 sm:px-6 lg:px-12',
        sizeStyles[size],
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
