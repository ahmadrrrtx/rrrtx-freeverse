import { Container } from '../atoms/Container';
import type { CatalogTopic } from '../../types';

/**
 * QualityPanel — published, automated assessment-quality status.
 *
 * This is deliberately unflattering: it reports the measured share of
 * items that a "always choose the longest option" strategy answers
 * correctly, and how many items are queued for rewrite. It exists so a
 * learner can calibrate how much a credential here is worth before
 * spending twenty minutes on it.
 */
export function QualityPanel({ topic }: { topic: CatalogTopic }) {
  const { quality } = topic;
  const underReview = quality.assessmentIntegrity !== 'verified';
  const longest = Math.round(quality.longestOptionBaseline * 100);
  const servable = Math.round(quality.servableBaseline * 100);

  return (
    <section className="border-b border-bg-3 bg-bg-1/40">
      <Container size="app">
        <div className="py-12 sm:py-14">
          <div className="font-mono text-[11px] uppercase tracking-widest text-fg-4">
            <span className="text-fg-5">// </span>question-quality · published status
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-8 lg:gap-12">
            <div>
              <h2 className="font-display font-black text-fg-0 text-xl sm:text-2xl leading-tight tracking-[-0.025em]">
                {underReview ? (
                  <>
                    This bank is <span className="text-warn-500">under review.</span>
                  </>
                ) : (
                  <>
                    This bank passed the <span className="text-term-glow">automated gate.</span>
                  </>
                )}
              </h2>
              <p className="mt-4 font-mono text-xs sm:text-sm text-fg-3 leading-relaxed max-w-[46rem]">
                <span className="text-fg-5">// </span>
                Every item is analysed automatically for the classic multiple-choice failure modes: the correct option
                being the longest one, “all of the above”, negative phrasing, giveaway distractors. Items that fail a
                blocking check are withheld from every attempt. Items that fail a non-blocking check stay in service but
                are excluded from the Advanced blueprint and queued for a human rewrite.
              </p>
              <p className="mt-4 font-mono text-xs text-fg-4 leading-relaxed max-w-[46rem]">
                <span className="text-fg-5">// </span>
                Automated analysis is not human review, and {quality.provisional} of {topic.questionCount} items have
                not been read by a human yet. See <span className="text-fg-3">ASSESSMENT_QUALITY.md</span> for the
                method, the numbers and the rewrite queue.
              </p>
            </div>

            <dl className="border border-bg-3 bg-bg-0 divide-y divide-bg-3 font-mono text-xs">
              <Row
                label="items in bank"
                value={`${topic.questionCount}`}
                note={`${topic.skills.length} skill areas`}
              />
              <Row label="passed every automated check" value={`${quality.approved}`} note="eligible for Advanced" />
              <Row label="queued for human rewrite" value={`${quality.provisional}`} note="served, excluded from Advanced" />
              <Row label="withheld" value={`${quality.rejected}`} note="never served" />
              <Row
                label="longest-option strategy scores"
                value={`${longest}%`}
                note={`${servable}% across items a level may serve`}
                tone={quality.lengthHeuristicRisk ? 'warn' : 'ok'}
              />
              <Row
                label="automated gate"
                value={quality.assessmentIntegrity}
                note={underReview ? 'credentials marked provisional' : 'verified'}
                tone={underReview ? 'warn' : 'ok'}
              />
            </dl>
          </div>

          {quality.lengthHeuristicRisk && (
            <p className="mt-8 border border-warn-500/30 bg-warn-500/[0.06] p-4 font-mono text-xs text-warn-500 leading-relaxed max-w-[52rem]">
              <span className="text-warn-500">// </span>
              Honest limitation: in this topic, answering “the longest option” without reading the question would clear
              the pass mark ({longest}% measured). Grading is server-side and every attempt is time-boxed, but this
              bank cannot yet tell a knowledgeable candidate apart from that strategy. Treat the credential as
              provisional evidence of skill, not proof of it.
            </p>
          )}
        </div>
      </Container>
    </section>
  );
}

function Row({
  label,
  value,
  note,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  note?: string;
  tone?: 'neutral' | 'warn' | 'ok';
}) {
  const valueClass = tone === 'warn' ? 'text-warn-500' : tone === 'ok' ? 'text-term-glow' : 'text-fg-1';
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <dt className="text-fg-4">
        {label}
        {note && <span className="block text-[10px] text-fg-5 mt-0.5">{note}</span>}
      </dt>
      <dd className={`${valueClass} shrink-0 uppercase tracking-wider text-[11px] pt-0.5`}>{value}</dd>
    </div>
  );
}
