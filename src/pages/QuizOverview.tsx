import { useParams, Link } from 'react-router-dom';
import { PageShell } from '../components/layout/PageShell';
import { Container } from '../components/atoms/Container';
import { Button } from '../components/atoms/Button';
import { QuizMeta } from '../components/quiz-overview/QuizMeta';
import { StatBoard } from '../components/quiz-overview/StatBoard';
import { SecureModeBriefing } from '../components/quiz-overview/SecureModeBriefing';
import { RecipientForm } from '../components/quiz-overview/RecipientForm';
import { QUIZ_CATALOG } from '../data/quizMeta';

/**
 * /quiz/:id — Quiz Overview page.
 *
 * Sections:
 *   1. QuizMeta           — breadcrumb + category + title + description
 *   2. StatBoard          — 4 stat tiles (questions / time / pass / pool)
 *   3. SecureModeBriefing — the 4 rules + consequence callout
 *   4. RecipientForm      — name/email/checkbox → start quiz
 */
export function QuizOverview() {
  const { id } = useParams<{ id: string }>();

  const idx = QUIZ_CATALOG.findIndex((q) => q.id === id);
  const quiz = idx >= 0 ? QUIZ_CATALOG[idx] : null;

  // Not found state
  if (!quiz) {
    return (
      <PageShell>
        <Container size="app">
          <div className="py-32 sm:py-40">
            <p className="font-mono text-xs uppercase tracking-widest text-fg-4">
              <span className="text-fg-5">// </span>error 404
            </p>
            <h1 className="
              mt-4 font-display font-black text-fg-0
              text-[2.25rem] sm:text-[3rem] leading-[1.05] tracking-[-0.035em]
            ">
              Quiz not <span className="text-err-500">found.</span>
            </h1>
            <p className="mt-4 font-mono text-sm sm:text-base text-fg-3 max-w-md">
              No quiz with id <code className="text-term-glow">{id}</code> exists in the catalog.
            </p>
            <div className="mt-10">
              <Link to="/">
                <Button variant="primary" size="lg" cmd>
                  back-to-quizzes
                </Button>
              </Link>
            </div>
          </div>
        </Container>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <QuizMeta quiz={quiz} index={idx + 1} />
      <StatBoard quiz={quiz} />
      <SecureModeBriefing />
      <RecipientForm quiz={quiz} />
    </PageShell>
  );
}
