/**
 * PreHero — the command-line introduction above the hero headline.
 * Animated typewriter effect on first load (respects reduced-motion).
 */
import { useEffect, useState } from 'react';

const FULL_CMD = 'rrrtx --certify';
const FULL_OUT = '// initializing free certification system...';

export function PreHero() {
  const [cmd, setCmd] = useState('');
  const [out, setOut] = useState('');

  useEffect(() => {
    // Respect reduced motion → skip animation
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setCmd(FULL_CMD);
      setOut(FULL_OUT);
      return;
    }

    let i = 0;
    let j = 0;
    let cmdTimer: ReturnType<typeof setInterval>;
    let outTimer: ReturnType<typeof setInterval>;

    cmdTimer = setInterval(() => {
      i++;
      setCmd(FULL_CMD.slice(0, i));
      if (i >= FULL_CMD.length) {
        clearInterval(cmdTimer);
        // After cmd finishes, type out the output line
        outTimer = setInterval(() => {
          j++;
          setOut(FULL_OUT.slice(0, j));
          if (j >= FULL_OUT.length) clearInterval(outTimer);
        }, 18);
      }
    }, 50);

    return () => {
      clearInterval(cmdTimer);
      clearInterval(outTimer);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="
        flex flex-wrap items-baseline gap-x-2 gap-y-1
        font-mono text-xs sm:text-sm text-fg-3
        mb-8 sm:mb-10
      "
    >
      <span className="text-term-glow">→</span>
      <span className="text-fg-0 font-medium">{cmd}</span>
      {cmd.length > 0 && <span className="text-fg-4">{out}</span>}
    </div>
  );
}
