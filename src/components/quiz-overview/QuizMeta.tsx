import { Link } from 'react-router-dom';
import { Container } from '../atoms/Container';
import { Pill } from '../atoms/Pill';
import type { QuizMeta as QuizMetaType } from '../../types';

interface QuizMetaProps {
  quiz: QuizMetaType;
  index: number; // 1-based position in catalog (for [01/15] display)
}

/**
 * Top of the Quiz Overview page.
 * Breadcrumb back to listing → category meta → big title → description.
 */
export function QuizMeta({ quiz, index }: QuizMetaProps) {
  return (
    <section className="pt-10 sm:pt-14 lg:pt-20 pb-12 sm:pb-16">
      <Container size="app">
        {/* Breadcrumb */}
        <Link
          to="/"
          className="
            inline-flex items-center gap-2
            font-mono text-xs uppercase tracking-widest text-fg-4
            hover:text-term-glow transition-colors duration-snap
          "
        >
          <span aria-hidden="true">←</span>
          <span>back to quizzes</span>
        </Link>

        {/* Meta + ID */}
        <div className="mt-10 sm:mt-14 flex items-center gap-3 flex-wrap">
          <Pill tone="term">{quiz.category}</Pill>
          <Pill tone="fg" bracket>
            {String(index).padStart(2, '0')}/15
          </Pill>
        </div>

        {/* Title */}
        <h1 className="
          mt-5 font-display font-black text-fg-0
          text-[2.25rem] leading-[1.05] tracking-[-0.035em]
          sm:text-[3rem] sm:leading-[1]
          lg:text-[4rem] lg:tracking-[-0.04em]
          max-w-[26ch]
        ">
          {quiz.title}
        </h1>

        {/* Description */}
        <p className="
          mt-5 sm:mt-6 font-mono text-fg-3 leading-relaxed
          text-sm sm:text-base
          max-w-[44rem]
        ">
          <span className="text-fg-5">// </span>
          {quiz.description}
        </p>
      </Container>
    </section>
  );
}
