import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Container } from '../atoms/Container';
import { SectionLabel, SectionHeading, SectionSub } from './SectionPrimitives';
import { QUIZ_CATALOG } from '../../data/quizMeta';
import { cn } from '../../lib/cn';

// Categories pulled from real catalog. "All" is added as the default filter.
const CATEGORIES = ['All', 'AI', 'Web Dev', 'Programming', 'Data', 'Career', 'Design', 'Security'] as const;
type Category = (typeof CATEGORIES)[number];

/**
 * QuizGrid — the 15-card tiled grid.
 * Category filter chips above (horizontal scroll on mobile).
 * Grid: 1 col mobile → 2 cols tablet → 3 cols desktop.
 * 1px borders via bg-3 gap (terminal-tiled feel).
 */
export function QuizGrid() {
  const [active, setActive] = useState<Category>('All');

  const filtered = useMemo(() => {
    if (active === 'All') return QUIZ_CATALOG;
    return QUIZ_CATALOG.filter((q) => q.category === active);
  }, [active]);

  return (
    <section id="quizzes" className="py-24 sm:py-32 border-b border-bg-3 scroll-mt-20">
      <Container size="marketing">
        <SectionLabel>start-here</SectionLabel>
        <SectionHeading>
          Choose your <span className="text-term-glow">first test.</span>
        </SectionHeading>
        <SectionSub>
          All quizzes follow the same standard — 20 questions, 20 minutes, 80% to pass.
          One certificate per test. No tiers.
        </SectionSub>

        {/* Category filter chips */}
        <div
          role="tablist"
          aria-label="Filter by category"
          className="
            mt-12 flex gap-2 overflow-x-auto pb-2
            [scrollbar-width:none] [-ms-overflow-style:none]
            [&::-webkit-scrollbar]:hidden
          "
        >
          {CATEGORIES.map((cat) => {
            const isActive = active === cat;
            const count = cat === 'All'
              ? QUIZ_CATALOG.length
              : QUIZ_CATALOG.filter((q) => q.category === cat).length;
            return (
              <button
                key={cat}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActive(cat)}
                className={cn(
                  'shrink-0 inline-flex items-center gap-2',
                  'px-3.5 py-2 font-mono text-xs uppercase tracking-wider',
                  'border transition-colors duration-snap',
                  'whitespace-nowrap rounded-none',
                  isActive
                    ? 'border-term-glow bg-term-soft text-term-glow'
                    : 'border-bg-3 text-fg-3 hover:border-fg-3 hover:text-fg-1',
                )}
              >
                {cat.toLowerCase()}
                <span className={cn(
                  'text-[10px] opacity-70',
                  isActive ? 'text-term-glow' : 'text-fg-5',
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tiled grid — 1px gap reveals bg-3 as the border */}
        <div className="mt-8 grid grid-cols-1 gap-px bg-bg-3 border border-bg-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((quiz, idx) => (
            <QuizCard key={quiz.id} quiz={quiz} index={idx + 1} />
          ))}
        </div>
      </Container>
    </section>
  );
}

interface QuizCardProps {
  quiz: (typeof QUIZ_CATALOG)[number];
  index: number;
}

function QuizCard({ quiz, index }: QuizCardProps) {
  // Compact category label (UPPERCASE, max 7 chars for visual rhythm)
  const catLabel = (() => {
    switch (quiz.category) {
      case 'Web Dev':     return 'WEB';
      case 'Programming': return 'PROG';
      case 'Career':      return 'CAREER';
      case 'Security':    return 'SEC';
      case 'Design':      return 'DESIGN';
      case 'Data':        return 'DATA';
      case 'AI':          return 'AI';
      default:            return String(quiz.category).toUpperCase();
    }
  })();

  return (
    <Link
      to={`/quiz/${quiz.id}`}
      className="
        group relative flex flex-col gap-3
        bg-bg-0 hover:bg-bg-1
        p-6 sm:p-7
        min-h-[230px]
        transition-colors duration-fast ease-out-expo
        focus-visible:outline-none focus-visible:bg-bg-1
        focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-term-glow
      "
    >
      {/* Top meta row */}
      <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-fg-4">
        <span>{catLabel} · {quiz.estimatedMinutes}min</span>
        <span className="text-fg-5">[{String(index).padStart(2, '0')}/15]</span>
      </div>

      {/* Title — Satoshi Bold */}
      <h3 className="
        font-display font-bold
        text-[1.25rem] leading-[1.15] tracking-[-0.02em]
        text-fg-0 group-hover:text-fg-0
      ">
        {quiz.title}
      </h3>

      {/* Description — mono small */}
      <p className="font-mono text-xs text-fg-3 leading-relaxed flex-1">
        <span className="text-fg-5">// </span>{quiz.description}
      </p>

      {/* Bottom row — dashed divider + meta + arrow */}
      <div className="
        flex items-center justify-between
        pt-4 border-t border-dashed border-bg-3
        font-mono text-[11px] text-fg-4
      ">
        <span>{quiz.totalQuestions} questions · 80% to pass</span>
        <span
          aria-hidden="true"
          className="
            text-fg-5 text-base
            transition-all duration-fast ease-out-expo
            group-hover:text-term-glow group-hover:translate-x-1
            motion-reduce:group-hover:translate-x-0
          "
        >
          →
        </span>
      </div>
    </Link>
  );
}
