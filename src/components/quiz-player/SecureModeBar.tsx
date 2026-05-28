import { cn } from '../../lib/cn';
import { StatusDot } from '../atoms/StatusDot';

interface SecureModeBarProps {
  secondsLeft: number;
  currentIdx: number;
  totalQuestions: number;
  answeredStates: boolean[];
  violationCount: number;
  maxViolations: number;
  /** Called when user clicks the exit (◇) icon */
  onExitRequest: () => void;
}

/**
 * SecureModeBar — sticky top bar during an active quiz.
 * Layout: [status·exit] · [TIMER center] · [progress·violations]
 */
export function SecureModeBar({
  secondsLeft,
  currentIdx,
  totalQuestions,
  answeredStates,
  violationCount,
  maxViolations,
  onExitRequest,
}: SecureModeBarProps) {
  const minutes = Math.floor(Math.max(secondsLeft, 0) / 60);
  const seconds = Math.max(secondsLeft, 0) % 60;
  const timerLow = secondsLeft <= 300;
  const timerCrit = secondsLeft <= 60;

  return (
    <div
      role="status"
      aria-label="Secure mode active"
      className="
        sticky top-0 z-50
        border-b border-bg-3
        bg-bg-0/95 backdrop-blur-sm
      "
    >
      <div className="
        mx-auto max-w-app
        px-4 sm:px-6 lg:px-8
        flex items-center justify-between
        gap-3 sm:gap-6
        h-12 sm:h-14
        font-mono text-[11px] sm:text-xs
      ">
        {/* LEFT — status + exit */}
        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <StatusDot state={violationCount === 0 ? 'online' : 'error'} />
            <span className="uppercase tracking-widest text-fg-3 hidden md:inline">
              secure-mode
            </span>
            <span className="uppercase tracking-widest text-term-glow font-medium">
              active
            </span>
          </div>

          {/* Exit (◇) button */}
          <button
            type="button"
            onClick={onExitRequest}
            aria-label="Exit quiz (discard progress)"
            title="Exit quiz"
            className="
              shrink-0 inline-flex items-center justify-center
              h-7 w-7 sm:h-8 sm:w-8
              border border-bg-3
              text-fg-4 hover:text-warn-500 hover:border-warn-500
              transition-colors duration-snap
              font-mono text-sm
            "
          >
            ◇
          </button>
        </div>

        {/* CENTER — timer */}
        <div className={cn(
          'font-semibold tabular-nums',
          'text-base sm:text-lg tracking-tight',
          timerCrit ? 'text-err-500 animate-pulse'
            : timerLow ? 'text-warn-500'
            : 'text-fg-0',
        )}>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>

        {/* RIGHT — progress + violations */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <span className="text-fg-3 uppercase tracking-widest whitespace-nowrap">
            <span className="text-fg-0 font-medium">{currentIdx + 1}</span>
            <span className="text-fg-5">/</span>
            <span>{totalQuestions}</span>
          </span>

          {violationCount > 0 && (
            <span className="
              flex items-center gap-1.5
              px-2 py-0.5
              border border-err-500/40 bg-err-500/10
              text-err-500 uppercase tracking-wider
            ">
              <span>!</span>
              <span className="font-medium">{violationCount}/{maxViolations}</span>
            </span>
          )}
        </div>
      </div>

      {/* Progress dot row */}
      <div className="
        mx-auto max-w-app
        px-4 sm:px-6 lg:px-8
        pb-2.5 sm:pb-3
      ">
        <div className="
          flex items-center gap-1
          overflow-x-auto
          [scrollbar-width:none] [-ms-overflow-style:none]
          [&::-webkit-scrollbar]:hidden
        ">
          {answeredStates.map((answered, i) => {
            const isCurrent = i === currentIdx;
            return (
              <span
                key={i}
                aria-label={`Question ${i + 1}: ${answered ? 'answered' : 'unanswered'}${isCurrent ? ' (current)' : ''}`}
                className={cn(
                  'shrink-0 h-1.5 rounded-none transition-all duration-snap',
                  isCurrent
                    ? 'w-6 bg-term-glow'
                    : answered
                      ? 'w-3 bg-term-glow/60'
                      : 'w-3 bg-bg-3',
                )}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
