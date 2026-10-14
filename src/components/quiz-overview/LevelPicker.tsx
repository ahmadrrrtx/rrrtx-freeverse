import { Container } from '../atoms/Container';
import type { CatalogLevel, CatalogTopic, LevelId } from '../../types';

interface LevelPickerProps {
  topic: CatalogTopic;
  selected: LevelId;
  onSelect: (level: LevelId) => void;
}

const LEVEL_ORDER: LevelId[] = ['foundation', 'intermediate', 'advanced'];

/**
 * LevelPicker — choose which level of the credential to attempt.
 *
 * Every level is a separate credential with its own blueprint, pass
 * mark and prerequisites. Levels whose item pool has not cleared the
 * review bar are shown but disabled, with the measured reason.
 */
export function LevelPicker({ topic, selected, onSelect }: LevelPickerProps) {
  const levels = LEVEL_ORDER.map((id) => topic.levels.find((l) => l.id === id)).filter(
    (l): l is CatalogLevel => Boolean(l),
  );

  return (
    <section className="border-b border-bg-3">
      <Container size="app">
        <div className="py-14 sm:py-16">
          <div className="font-mono text-[11px] uppercase tracking-widest text-fg-4">
            <span className="text-fg-5">// </span>choose-level
          </div>
          <h2 className="mt-4 font-display font-black text-fg-0 text-[1.75rem] leading-[1.1] tracking-[-0.03em] sm:text-[2.25rem] sm:leading-[1.05] max-w-[36rem]">
            Three levels. <span className="text-term-glow">Separate credentials.</span>
          </h2>
          <p className="mt-4 font-mono text-sm sm:text-base text-fg-3 leading-relaxed max-w-[44rem]">
            <span className="text-fg-5">// </span>
            Each level draws a different item set from the same bank and demands a different pass mark. Higher levels
            require the level below them for this topic.
          </p>

          <div
            role="radiogroup"
            aria-label="Assessment level"
            className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-px bg-bg-3 border border-bg-3"
          >
            {levels.map((level) => {
              const isSelected = level.id === selected;
              const disabled = !level.available;
              return (
                <button
                  key={level.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-disabled={disabled}
                  disabled={disabled}
                  onClick={() => onSelect(level.id)}
                  className={[
                    'text-left p-5 sm:p-6 transition-colors outline-none',
                    'focus-visible:ring-2 focus-visible:ring-term-glow',
                    disabled
                      ? 'bg-bg-1/60 cursor-not-allowed'
                      : isSelected
                        ? 'bg-term-soft cursor-pointer'
                        : 'bg-bg-0 hover:bg-bg-1 cursor-pointer',
                  ].join(' ')}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={[
                        'font-mono text-[11px] uppercase tracking-widest',
                        disabled ? 'text-fg-5' : isSelected ? 'text-term-glow' : 'text-fg-4',
                      ].join(' ')}
                    >
                      {isSelected && !disabled ? '◆ ' : ''}
                      {level.label}
                    </span>
                    <span className="font-mono text-[11px] text-fg-4">
                      {disabled ? 'unavailable' : `${level.passingScore}% to pass`}
                    </span>
                  </div>

                  <p className={['mt-3 font-mono text-xs leading-relaxed', disabled ? 'text-fg-5' : 'text-fg-3'].join(' ')}>
                    {level.tagline}
                  </p>

                  <dl className="mt-4 space-y-1 font-mono text-[11px] text-fg-4">
                    <div className="flex justify-between gap-3">
                      <dt>questions</dt>
                      <dd className="text-fg-3">{level.questionCount}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>time limit</dt>
                      <dd className="text-fg-3">{Math.round(level.durationSec / 60)} min</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>requires</dt>
                      <dd className="text-fg-3">
                        {level.requiresLevel ? `${level.requiresLevel} credential` : 'none'}
                      </dd>
                    </div>
                  </dl>

                  {disabled && level.unavailableReason && (
                    <p className="mt-4 border border-warn-500/30 bg-warn-500/[0.06] p-3 font-mono text-[11px] text-warn-500 leading-relaxed">
                      {level.unavailableReason}
                    </p>
                  )}

                  {!disabled && level.demonstrates.length > 0 && (
                    <ul className="mt-4 space-y-1 font-mono text-[11px] text-fg-4 leading-relaxed">
                      {level.demonstrates.map((item) => (
                        <li key={item}>· {item}</li>
                      ))}
                    </ul>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
}
