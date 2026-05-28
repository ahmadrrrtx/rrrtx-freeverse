import { useEffect, useState } from 'react';

interface ForceSubmitOverlayProps {
  reason: string;
  onComplete: () => void;
}

/**
 * Full-screen overlay shown when secure mode triggers force-submit.
 * 3-second countdown, then calls onComplete to grade and navigate.
 * Cannot be dismissed.
 */
export function ForceSubmitOverlay({ reason, onComplete }: ForceSubmitOverlayProps) {
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (count === 0) {
      onComplete();
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count, onComplete]);

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="Force submit — quiz ending"
      className="
        fixed inset-0 z-[90]
        flex items-center justify-center
        bg-bg-0/95 backdrop-blur-md
        animate-fade-in
        p-6
      "
    >
      <div className="text-center max-w-md">
        <div className="font-mono text-[11px] uppercase tracking-widest text-err-500">
          <span className="opacity-60">// </span>force_submit · integrity_violation
        </div>

        <h2 className="
          mt-4 font-display font-black text-fg-0
          text-3xl sm:text-4xl leading-tight tracking-[-0.03em]
        ">
          Auto-submitting in
        </h2>

        <div className="
          mt-8 font-display font-black text-err-500
          text-[8rem] sm:text-[10rem] leading-none tracking-[-0.06em]
        ">
          {count}
        </div>

        <p className="mt-8 font-mono text-sm text-fg-2 leading-relaxed">
          <span className="text-err-500 font-medium">reason: </span>
          {reason}
        </p>

        <p className="mt-3 font-mono text-xs text-fg-4 leading-relaxed">
          <span className="text-fg-5">// </span>
          your attempt is being submitted with your current answers.
          this violation is recorded in your certificate hash.
        </p>
      </div>
    </div>
  );
}
