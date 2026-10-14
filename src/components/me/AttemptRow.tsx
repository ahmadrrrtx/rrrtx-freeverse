import { QUIZ_CATALOG } from '../../data/quizMeta';
import type { StoredResult } from '../../lib/attemptSession';

/**
 * AttemptRow — one finalised attempt in the learner's history.
 *
 * The numbers come from the server's graded result (the token in
 * storage is signed, and /api/result re-derives them), so this list
 * cannot show a score the server never produced.
 */
export function AttemptRow({ entry }: { entry: StoredResult }) {
  const result = entry.result;
  const quiz = QUIZ_CATALOG.find((q) => q.id === result.topicId);
  const date = new Date(result.submittedAt);

  const status = result.passed
    ? { label: 'passed', color: 'text-term-glow border-term-glow/40 bg-term-soft' }
    : result.reason === 'violations' || result.reason === 'abandoned'
      ? { label: result.reason === 'violations' ? 'integrity stop' : 'abandoned', color: 'text-warn-500 border-warn-500/40 bg-warn-500/10' }
      : { label: 'not passed', color: 'text-err-500 border-err-500/40 bg-err-500/10' };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 sm:gap-6 items-baseline border-b border-bg-3 py-4 last:border-b-0">
      <div className="min-w-0">
        <div className="font-mono text-sm text-fg-1 truncate">{quiz?.title ?? result.topicId}</div>
        <div className="font-mono text-[11px] text-fg-4">
          {result.level} · {date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}{' '}
          {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
      <div className="font-mono text-sm text-fg-1">
        {result.score}
        <span className="text-fg-5">/100</span>{' '}
        <span className="text-fg-4 text-[11px]">
          ({result.correctCount}/{result.totalCount})
        </span>
      </div>
      <span className={`font-mono text-[11px] uppercase tracking-widest border px-2.5 py-1 justify-self-start sm:justify-self-end ${status.color}`}>
        {status.label}
      </span>
    </div>
  );
}
