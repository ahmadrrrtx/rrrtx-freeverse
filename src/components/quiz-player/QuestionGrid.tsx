import { useEffect } from 'react';
import { cn } from '../../lib/cn';

interface QuestionGridProps {
  open: boolean;
  onClose: () => void;
  totalQuestions: number;
  currentIdx: number;
  answers: (number | null)[];
  onJump: (idx: number) => void;
  onSubmit: () => void;
}

/**
 * QuestionGrid — overlay modal showing 20-question status grid.
 * Each cell shows the question number + a color indicating state:
 *   - answered   = soft green
 *   - current    = solid green w/ black text
 *   - unanswered = neutral border, fg-3
 * Click a cell to jump to that question + close modal.
 * Mobile: bottom-sheet style. Desktop: centered modal.
 */
export function QuestionGrid({
  open,
  onClose,
  totalQuestions,
  currentIdx,
  answers,
  onJump,
  onSubmit,
}: QuestionGridProps) {
  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const answeredCount = answers.filter((a) => a !== null).length;
  const remaining = totalQuestions - answeredCount;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Question navigator"
      className="
        fixed inset-0 z-[60]
        flex items-end sm:items-center justify-center
        bg-bg-0/80 backdrop-blur-sm
        animate-fade-in
      "
      onClick={onClose}
    >
      <div
        className="
          relative w-full sm:max-w-md
          bg-bg-1 border-t border-bg-3 sm:border sm:border-bg-3
          p-5 sm:p-6
          animate-fade-in-up
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-widest text-fg-4">
              <span className="text-fg-5">// </span>question_grid
            </div>
            <p className="mt-2 font-mono text-sm text-fg-2">
              <span className="text-term-glow font-medium">{answeredCount}</span>
              <span className="text-fg-5"> / </span>
              <span className="text-fg-1">{totalQuestions}</span>
              <span className="text-fg-4"> answered · </span>
              <span className="text-warn-500">{remaining} remaining</span>
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="
              shrink-0 h-8 w-8
              flex items-center justify-center
              border border-bg-3
              text-fg-3 hover:text-fg-0 hover:border-fg-3
              transition-colors duration-snap
            "
          >
            ✕
          </button>
        </div>

        {/* The grid — 5 cols mobile, 5 cols desktop (20 questions = 4 rows) */}
        <div className="grid grid-cols-5 gap-2 mb-6">
          {Array.from({ length: totalQuestions }).map((_, i) => {
            const isAnswered = answers[i] !== null;
            const isCurrent = i === currentIdx;
            return (
              <button
                key={i}
                type="button"
                onClick={() => { onJump(i); onClose(); }}
                aria-label={`Go to question ${i + 1}${isAnswered ? ' (answered)' : ' (unanswered)'}${isCurrent ? ' (current)' : ''}`}
                className={cn(
                  'aspect-square flex items-center justify-center',
                  'font-mono text-sm font-medium',
                  'border transition-all duration-snap',
                  isCurrent
                    ? 'border-term-glow bg-term-glow text-bg-0'
                    : isAnswered
                      ? 'border-term-glow/40 bg-term-soft text-term-glow hover:border-term-glow'
                      : 'border-bg-3 bg-bg-0 text-fg-3 hover:border-fg-3 hover:text-fg-1',
                )}
              >
                {String(i + 1).padStart(2, '0')}
              </button>
            );
          })}
        </div>

        {/* Footer — submit */}
        <button
          type="button"
          onClick={() => { onClose(); onSubmit(); }}
          className="
            w-full inline-flex items-center justify-center gap-2
            h-11 px-5
            font-mono text-sm font-bold text-bg-0
            bg-term-glow
            [box-shadow:4px_4px_0_theme(colors.term.deep)]
            hover:translate-x-[-2px] hover:translate-y-[-2px]
            hover:[box-shadow:6px_6px_0_theme(colors.term.deep)]
            active:translate-x-0 active:translate-y-0
            active:[box-shadow:2px_2px_0_theme(colors.term.deep)]
            transition-all duration-fast ease-out-expo
            motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0
          "
        >
          $ submit-now →
        </button>
        <p className="mt-3 font-mono text-[11px] text-fg-4 text-center">
          unanswered questions will be marked wrong
        </p>
      </div>
    </div>
  );
}
