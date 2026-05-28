import { useEffect } from 'react';
import { Button } from '../atoms/Button';

interface SubmitModalProps {
  open: boolean;
  totalQuestions: number;
  answeredCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Modal asking user to confirm submit.
 * Shows answered/unanswered counts. Warns if any unanswered.
 */
export function SubmitModal({
  open,
  totalQuestions,
  answeredCount,
  onConfirm,
  onCancel,
}: SubmitModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const remaining = totalQuestions - answeredCount;
  const hasUnanswered = remaining > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="submit-modal-title"
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
          <span className="text-fg-5">// </span>confirm_submit
        </div>

        <h2
          id="submit-modal-title"
          className="
            mt-3 font-display font-black text-fg-0
            text-2xl sm:text-3xl leading-tight tracking-[-0.025em]
          "
        >
          Submit your <span className="text-term-glow">attempt?</span>
        </h2>

        <div className="mt-6 border border-bg-3 bg-bg-0 p-4">
          <p className="font-mono text-sm text-fg-2 leading-relaxed">
            <span className="text-term-glow font-medium">{answeredCount}</span>
            <span className="text-fg-5"> / </span>
            <span className="text-fg-0 font-medium">{totalQuestions}</span>
            <span className="text-fg-4"> answered</span>
          </p>
          {hasUnanswered && (
            <p className="mt-2 font-mono text-xs text-warn-500 leading-relaxed">
              {remaining} unanswered {remaining === 1 ? 'question' : 'questions'} will be marked wrong.
            </p>
          )}
        </div>

        <p className="mt-5 font-mono text-xs text-fg-4 leading-relaxed">
          <span className="text-fg-5">// </span>
          this action is final. you cannot return to edit answers after submission.
        </p>

        <div className="mt-7 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <Button variant="ghost" size="md" onClick={onCancel}>
            keep going
          </Button>
          <Button variant="primary" size="md" cmd onClick={onConfirm}>
            submit-now
          </Button>
        </div>
      </div>
    </div>
  );
}
