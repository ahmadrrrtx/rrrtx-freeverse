import { Button } from '../atoms/Button';
import { cn } from '../../lib/cn';

interface PlayerControlsProps {
  currentIdx: number;
  totalQuestions: number;
  hasAnsweredCurrent: boolean;
  onPrev: () => void;
  onNext: () => void;
  onOpenGrid: () => void;
  onSubmit: () => void;
}

/**
 * PlayerControls — sticky bottom bar with navigation + submit.
 * Mobile: prev/next take equal width, submit shifts to full row below
 * Desktop: everything in a single row
 */
export function PlayerControls({
  currentIdx,
  totalQuestions,
  hasAnsweredCurrent,
  onPrev,
  onNext,
  onOpenGrid,
  onSubmit,
}: PlayerControlsProps) {
  const isFirst = currentIdx === 0;
  const isLast = currentIdx === totalQuestions - 1;

  return (
    <div className={cn(
      'sticky bottom-0 z-40',
      'border-t border-bg-3 bg-bg-0/95 backdrop-blur-sm',
    )}>
      <div className="
        mx-auto max-w-app
        px-4 sm:px-6 lg:px-8
        py-3 sm:py-4
        flex items-center justify-between gap-3
      ">
        {/* Left — prev + grid */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={onPrev}
            disabled={isFirst}
            aria-label="Previous question"
          >
            <span aria-hidden="true">←</span>
            <span className="hidden sm:inline">prev</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={onOpenGrid}
            aria-label="Open question navigator"
          >
            <span aria-hidden="true">◫</span>
            <span className="hidden sm:inline">grid</span>
          </Button>
        </div>

        {/* Right — next OR submit */}
        <div className="flex items-center gap-2 sm:gap-3">
          {!isLast ? (
            <Button
              type="button"
              variant={hasAnsweredCurrent ? 'primary' : 'ghost'}
              size="md"
              onClick={onNext}
              cmd={hasAnsweredCurrent}
            >
              <span className="hidden sm:inline">next</span>
              <span aria-hidden="true">→</span>
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={onSubmit}
              cmd
            >
              submit →
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
