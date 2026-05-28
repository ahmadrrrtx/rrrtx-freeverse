import { Container } from '../atoms/Container';

interface Stat {
  num: string;
  label: string;
}

const STATS: Stat[] = [
  { num: '15',     label: 'certifications' },
  { num: '1,500',  label: 'questions written' },
  { num: '80%',    label: 'to pass' },
  { num: '$0',     label: 'forever' },
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
