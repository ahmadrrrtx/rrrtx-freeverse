import { Container } from '../atoms/Container';
import { CATALOG_TOTALS } from '../../data/quizMeta';

interface Stat {
  num: string;
  label: string;
}

// Every number here is measured from the generated catalog
// (src/data/bankCatalog.json) so the landing page cannot drift from the bank,
// the levels or the pass marks the server actually enforces.
const STATS: Stat[] = [
  { num: String(CATALOG_TOTALS.topics), label: 'skill assessments' },
  { num: CATALOG_TOTALS.questions.toLocaleString('en-US'), label: 'questions, analysed' },
  { num: `${CATALOG_TOTALS.levels}`, label: 'levels per topic' },
  { num: '$0', label: 'paywall' },
];

/**
 * StatStrip — 4 large stat tiles in a horizontal bar.
 * Massive numbers (Satoshi 56-72px), small monospace labels below.
 * Borders top + bottom create a magazine "rule" feel.
 */
export function StatStrip() {
  return (
    <section className="border-y border-bg-3">
      <Container size="marketing">
        <div className="
          grid grid-cols-2 gap-y-10 gap-x-8
          py-12 sm:grid-cols-4 sm:py-16 sm:gap-x-12
        ">
          {STATS.map((s) => (
            <div key={s.label} className="flex flex-col">
              <span className="
                font-display font-black text-fg-0
                text-[3rem] leading-none tracking-[-0.04em]
                sm:text-[3.5rem] lg:text-[4rem]
              ">
                {s.num}
              </span>
              <span className="
                mt-3 font-mono text-[11px] uppercase tracking-widest text-fg-4
                sm:text-xs
              ">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
