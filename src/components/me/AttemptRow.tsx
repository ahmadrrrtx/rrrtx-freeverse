import { QUIZ_CATALOG } from '../../data/quizMeta';
import { cn } from '../../lib/cn';
import type { QuizResult } from '../../types';

interface AttemptRowProps {
  result: QuizResult;
}

/**
 * AttemptRow — row in the quiz history table.
 * Shows: quiz title · date · score · status pill
 * Mobile: stacks the date/status under title.
 */
export function AttemptRow({ result }: AttemptRowProps) {
  const quiz = QUIZ_CATALOG.find((q) => q.id === result.quizId);
  const date = new Date(result.submittedAt);
  const formatted = date.toLocaleDateString('en-US', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  const time = date.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  });

  const status = result.forceSubmitted
    ? { label: 'force-submitted', color: 'text-warn-500 border-warn-500/40 bg-warn-500/10' }
    : result.passed
      ? { label: 'passed',         color: 'text-term-glow border-term-glow/40 bg-term-soft' }
      : { label: 'not passed',     color: 'text-err-500 border-err-500/40 bg-err-500/10' };

  return (
    <div className="
      grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto_auto]
      gap-3 sm:gap-6 items-center
      p-4 sm:p-5
      bg-bg-0
    ">
      {/* Title col */}
      <div className="min-w-0">
        <p className="font-mono text-sm text-fg-1 truncate">
          {quiz?.title ?? result.quizId}
        </p>
        <p className="mt-1 font-mono text-[11px] text-fg-4 sm:hidden">
          {formatted} · {time}
        </p>
      </div>

      {/* Date col (desktop only) */}
      <div className="hidden sm:block font-mono text-xs text-fg-4 whitespace-nowrap">
        {formatted}
        <span className="text-fg-5 mx-1.5">·</span>
        {time}
      </div>

      {/* Score col */}
      <div className="font-mono text-sm tabular-nums whitespace-nowrap text-right">
        <span className={cn(
          'font-medium',
          result.passed ? 'text-term-glow' : 'text-err-500',
        )}>
          {result.score}
        </span>
        <span className="text-fg-5">/100</span>
      </div>

      {/* Status pill (desktop only) */}
      <div className="hidden sm:block">
        <span className={cn(
          'inline-flex items-center px-2.5 py-0.5 border',
          'font-mono text-[10px] uppercase tracking-wider',
          status.color,
        )}>
          {status.label}
        </span>
      </div>
    </div>
  );
}
