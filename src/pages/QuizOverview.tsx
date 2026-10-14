import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageShell } from '../components/layout/PageShell';
import { Container } from '../components/atoms/Container';
import { Button } from '../components/atoms/Button';
import { QuizMeta } from '../components/quiz-overview/QuizMeta';
import { LevelPicker } from '../components/quiz-overview/LevelPicker';
import { StatBoard } from '../components/quiz-overview/StatBoard';
import { QualityPanel } from '../components/quiz-overview/QualityPanel';
import { SecureModeBriefing } from '../components/quiz-overview/SecureModeBriefing';
import { RecipientForm } from '../components/quiz-overview/RecipientForm';
import { CATALOG_TOTALS, getTopic, getTopicQuizMeta, topicPosition } from '../data/quizMeta';
import type { LevelId } from '../types';

const LEVEL_ORDER: LevelId[] = ['foundation', 'intermediate', 'advanced'];

/**
 * /quiz/:id — assessment overview.
 *
 * Everything on this page is catalog data (no question text, no answer
 * keys): the levels on offer, what each one costs in time, what it
 * demands to pass, its prerequisites, and the published
 * assessment-quality status of the bank behind it.
 */
export function QuizOverview() {
  const { id } = useParams<{ id: string }>();
  const topic = getTopic(id);

  const defaultLevel = useMemo<LevelId>(() => {
    if (!topic) return 'foundation';
    const firstAvailable = LEVEL_ORDER.find((l) => topic.levels.find((x) => x.id === l)?.available);
    return firstAvailable ?? 'foundation';
  }, [topic]);

  const [level, setLevel] = useState<LevelId>(defaultLevel);
  const selected = topic?.levels.find((l) => l.id === level) ?? null;
  const quizMeta = topic ? getTopicQuizMeta(topic) : null;

  if (!topic || !quizMeta) {
    return (
      <PageShell>
        <Container size="app">
          <div className="py-32 sm:py-40">
            <p className="font-mono text-xs uppercase tracking-widest text-fg-4">
              <span className="text-fg-5">// </span>error 404
            </p>
            <h1 className="mt-4 font-display font-black text-fg-0 text-[2.25rem] sm:text-[3rem] leading-[1.05] tracking-[-0.035em]">
              Assessment not <span className="text-err-500">found.</span>
            </h1>
            <p className="mt-4 font-mono text-sm sm:text-base text-fg-3 max-w-md">
              No assessment with id <code className="text-term-glow">{String(id)}</code> exists in the catalog.
            </p>
            <div className="mt-10">
              <Link to="/">
                <Button variant="primary" size="lg" cmd>
                  back-to-assessments
                </Button>
              </Link>
            </div>
          </div>
        </Container>
      </PageShell>
    );
  }

  const index = topicPosition(topic.id);

  return (
    <PageShell>
      <QuizMeta quiz={quizMeta} index={index} total={CATALOG_TOTALS.topics} />
      <LevelPicker topic={topic} selected={level} onSelect={setLevel} />
      {selected && (
        <StatBoard
          levelLabel={selected.label}
          questionCount={selected.questionCount}
          durationSec={selected.durationSec}
          passingScore={selected.passingScore}
          poolSize={topic.questionCount}
          available={selected.available}
        />
      )}
      <QualityPanel topic={topic} />
      <SecureModeBriefing />
      {selected && (
        <RecipientForm quiz={quizMeta} level={selected.id} levelLabel={selected.label} />
      )}
    </PageShell>
  );
}
