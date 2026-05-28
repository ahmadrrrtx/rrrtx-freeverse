import { useEffect } from 'react';
import { Button } from '../atoms/Button';

interface AbandonModalProps {
  open: boolean;
  answeredCount: number;
  totalQuestions: number;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * AbandonModal — confirmation before quitting an in-progress quiz.
 * Discards progress, exits secure mode, no penalty / no force-submit flag.
 */
export function AbandonModal({
  open, answeredCount, totalQuestions, onConfirm, onCancel,
}: AbandonModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="abandon-modal-title"
      className="
        fixed inset-0 z-[80]
        flex items-center justify-center
        bg-bg-0/85 backdrop-blur-sm
        animate-fade-in
        p-4
      "
      onClick={onCancel}
    >
      <div
        className="
          relative w-full max-w-md
          bg-bg-1 border border-bg-3
          p-6 sm:p-7
          animate-fade-in-up
        "
        onClick={(e) => e.stopPropagation()}
      >
        <div className="font-mono text-[11px] uppercase tracking-widest text-fg-4">
          <span className="text-fg-5">// </span>confirm_abandon
        </div>

        <h2
          id="abandon-modal-title"
          className="
            mt-3 font-display font-black text-fg-0
            text-2xl sm:text-3xl leading-tight tracking-[-0.025em]
          "
        >
          Abandon this <span className="text-warn-500">attempt?</span>
        </h2>

        <p className="mt-5 font-mono text-sm text-fg-2 leading-relaxed">
          You've answered <span className="text-fg-0 font-medium">{answeredCount}</span> of {totalQuestions} questions.
        </p>

        <div className="mt-4 border border-bg-3 bg-bg-0 p-4">
          <p className="font-mono text-xs text-fg-3 leading-relaxed">
            <span className="text-fg-5">// </span>
            this is <span className="text-fg-1">NOT</span> a force-submit. your progress will be discarded
            and no result will be recorded. you can re-take the quiz immediately with no cooldown.
          </p>
        </div>

        <div className="mt-7 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <Button variant="ghost" size="md" onClick={onCancel}>
            keep going
          </Button>
          <Button variant="danger" size="md" onClick={onConfirm}>
            abandon attempt
          </Button>
        </div>
      </div>
    </div>
  );
}
