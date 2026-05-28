import { Link } from 'react-router-dom';
import { QUIZ_CATALOG } from '../../data/quizMeta';
import type { Certificate as CertificateRecord } from '../../types';

interface CertRowCardProps {
  cert: CertificateRecord;
}

/**
 * CertRowCard — horizontal card representing one earned certificate.
 * Layout:
 *   - Left: category badge + score number
 *   - Middle: quiz title + date + cert ID
 *   - Right: chevron → links to /cert/:id
 *
 * Mobile: stacks vertically with the score on top.
 */
export function CertRowCard({ cert }: CertRowCardProps) {
  const quiz = QUIZ_CATALOG.find((q) => q.id === cert.quiz.id);
  const issuedDate = new Date(cert.issued_at);
  const formatted = issuedDate.toLocaleDateString('en-US', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return (
    <Link
      to={`/cert/${cert.id}`}
      className="
        group block bg-bg-0 hover:bg-bg-1
        transition-colors duration-fast ease-out-expo
        focus-visible:outline-none focus-visible:bg-bg-1
        focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-term-glow
      "
    >
      <div className="
        grid grid-cols-[auto_1fr_auto] gap-4 sm:gap-6 items-center
        p-5 sm:p-6
      ">
        {/* LEFT — score badge */}
        <div className="
          flex flex-col items-center justify-center
          min-w-[64px] sm:min-w-[80px]
          aspect-square
          border border-term-glow/40 bg-term-soft
        ">
          <span className="font-display font-black text-term-glow text-2xl sm:text-3xl leading-none">
            {cert.score}
          </span>
          <span className="font-mono text-[9px] uppercase tracking-widest text-term-glow/60 mt-1">
            / 100
          </span>
        </div>

        {/* MIDDLE — meta + title */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            {quiz && (
              <span className="font-mono text-[10px] uppercase tracking-widest text-fg-4">
                {quiz.category}
              </span>
            )}
            <span className="font-mono text-[10px] text-fg-5">·</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-fg-4">
              {formatted}
            </span>
          </div>
          <h3 className="
            font-display font-bold text-fg-0
            text-base sm:text-lg leading-tight tracking-[-0.015em]
            group-hover:text-term-glow transition-colors duration-snap
          ">
            {cert.quiz.title}
          </h3>
          <p className="mt-1.5 font-mono text-[11px] text-fg-4 truncate">
            <span className="text-fg-5">id: </span>
            <span className="text-term-glow">{cert.id}</span>
          </p>
        </div>

        {/* RIGHT — arrow */}
        <div
          aria-hidden="true"
          className="
            text-fg-5 text-lg
            transition-all duration-fast ease-out-expo
            group-hover:text-term-glow group-hover:translate-x-1
            motion-reduce:group-hover:translate-x-0
          "
        >
          →
        </div>
      </div>
    </Link>
  );
}
