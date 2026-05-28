// ────────────────────────────────────────────────────────────
// RRRTX FreeVerse — className utility
// Tiny clsx-style className composer with tailwind-merge
// ────────────────────────────────────────────────────────────

import clsx, { type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
