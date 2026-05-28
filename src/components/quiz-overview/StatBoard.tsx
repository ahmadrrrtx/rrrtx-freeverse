import { Container } from '../atoms/Container';
import { StatTile } from '../atoms/StatTile';
import type { QuizMeta } from '../../types';

interface StatBoardProps {
  quiz: QuizMeta;
}

/**
 * 4-tile stat board showing the test parameters.
 * Mobile: 2x2 grid. Desktop: 1x4 row.
 * 1px gaps via bg-3 (tiled terminal look).
 */
export function StatBoard({ quiz }: StatBoardProps) {
  return (
    <section className="border-y border-bg-3">
      <Container size="app">
        <div className="
          grid grid-cols-2 sm:grid-cols-4
          gap-px bg-bg-3
          border-x border-bg-3
          -mx-px
        ">
          <StatTile label="questions" value={quiz.perAttempt} />
          <StatTile label="time limit" value={`${quiz.estimatedMinutes}min`} />
          <StatTile label="to pass" value="80%" emphasized />
          <StatTile label="pool size" value={quiz.totalQuestions} />
        </div>
      </Container>
    </section>
  );
}
