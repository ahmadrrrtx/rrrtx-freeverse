import { cn } from '../../lib/cn';
import type { ShuffledQuestion } from '../../types';

interface QuestionViewProps {
  /** The shuffled question */
  question: ShuffledQuestion;
  /** Display number (1-based) */
  number: number;
  total: number;
  /** Currently-selected option index (0-3) or null */
  selected: number | null;
  /** Called when user picks an option */
  onSelect: (idx: number) => void;
}

/** Letter labels for the options */
const LETTERS = ['A', 'B', 'C', 'D'];

/**
 * QuestionView — single question with 4 selectable option cards.
 * Click anywhere on a card to select. Keyboard 1/2/3/4 also selects.
 * Selected option: term-glow border + soft green background.
 */
export function QuestionView({
  question,
  number,
  total,
  selected,
  onSelect,
}: QuestionViewProps) {
  return (
    <div className="flex flex-col gap-7 sm:gap-10">
      {/* Question number marker */}
      <div className="
        font-mono text-[11px] sm:text-xs uppercase tracking-widest text-fg-4
      ">
        <span className="text-fg-5">// </span>
        question <span className="text-fg-1 font-medium">{String(number).padStart(2, '0')}</span> of {String(total).padStart(2, '0')}
      </div>

      {/* The question text */}
      <h2
        // Allow text selection of question text itself (helps comprehension)
        // even though secureMode blocks copy globally
        className="
          font-display font-bold text-fg-0
          text-xl sm:text-2xl lg:text-[1.75rem]
          leading-[1.3] tracking-[-0.015em]
          max-w-[40rem]
        "
      >
        {question.q}
      </h2>

      {/* Options */}
      <fieldset className="flex flex-col gap-3">
        <legend className="sr-only">Choose one option</legend>
        {question.options.map((opt, i) => {
          const isSelected = selected === i;
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelect(i)}
              className={cn(
                'group w-full text-left',
                'flex items-start gap-3 sm:gap-4',
                'p-4 sm:p-5',
                'border bg-bg-1',
                'font-mono text-sm sm:text-[15px] text-fg-1 leading-relaxed',
                'transition-all duration-snap ease-out-expo',
                'focus-visible:outline-none',
                isSelected
                  ? 'border-term-glow bg-term-soft text-fg-0'
                  : 'border-bg-3 hover:border-fg-3 hover:bg-bg-2',
              )}
            >
              {/* Letter marker */}
              <span
                aria-hidden="true"
                className={cn(
                  'shrink-0 flex items-center justify-center',
                  'h-7 w-7 sm:h-8 sm:w-8',
                  'border font-display font-bold text-sm',
                  'transition-colors duration-snap',
                  isSelected
                    ? 'border-term-glow bg-term-glow text-bg-0'
                    : 'border-bg-3 text-fg-3 group-hover:border-fg-3 group-hover:text-fg-1',
                )}
              >
                {LETTERS[i]}
              </span>

              {/* Option text */}
              <span className="flex-1 min-w-0 mt-0.5">
                {opt}
              </span>
            </button>
          );
        })}
      </fieldset>
    </div>
  );
}
