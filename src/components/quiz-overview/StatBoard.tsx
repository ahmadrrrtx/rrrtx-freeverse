import { Container } from '../atoms/Container';
import { StatTile } from '../atoms/StatTile';

interface StatBoardProps {
  levelLabel: string;
  questionCount: number;
  durationSec: number;
  passingScore: number;
  poolSize: number;
  available: boolean;
}

/**
 * StatBoard — 4-tile stat board for the selected level.
 * Mobile: 2x2 grid. Desktop: 1x4 row. 1px gaps via bg-3 (tiled look).
 * Values come from the published catalog, which is generated from the
 * same manifest the server grades with — so the numbers shown here are
 * the numbers enforced at grading time.
 */
export function StatBoard({
  levelLabel,
  questionCount,
  durationSec,
  passingScore,
  poolSize,
  available,
}: StatBoardProps) {
  return (
    <section className="border-y border-bg-3">
      <Container size="app">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-bg-3 border-x border-bg-3 -mx-px">
          <StatTile label="questions" value={questionCount} />
          <StatTile label="time limit" value={`${Math.round(durationSec / 60)}min`} />
          <StatTile label="to pass" value={`${passingScore}%`} emphasized />
          <StatTile label="level" value={available ? levelLabel.toLowerCase() : 'unavailable'} />
        </div>
        <p className="py-3 font-mono text-[11px] text-fg-5 leading-relaxed">
          <span className="text-fg-5">// </span>
          drawn from a pool of {poolSize} analysed items in this topic · graded on the server · {questionCount} questions
          per attempt
        </p>
      </Container>
    </section>
  );
}
