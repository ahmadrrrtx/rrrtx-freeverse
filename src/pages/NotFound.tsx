import { Link, useLocation } from 'react-router-dom';
import { PageShell } from '../components/layout/PageShell';
import { Container } from '../components/atoms/Container';
import { Button } from '../components/atoms/Button';

/**
 * 404 — Page not found.
 * Branded, helpful, on-style. Suggests valid routes.
 */
export function NotFound() {
  const location = useLocation();

  return (
    <PageShell>
      <Container size="app">
        <div className="py-20 sm:py-32 max-w-2xl">

          <div className="font-mono text-[11px] uppercase tracking-widest text-err-500">
            <span className="opacity-60">// </span>error · 404 · route_not_found
          </div>

          <h1 className="
            mt-6 font-display font-black text-fg-0
            text-[6rem] leading-none tracking-[-0.05em]
            sm:text-[9rem]
            lg:text-[12rem]
          ">
            <span className="text-err-500">4</span>
            <span>0</span>
            <span className="text-term-glow">4</span>
          </h1>

          <p className="mt-10 font-mono text-base sm:text-lg text-fg-2 leading-relaxed">
            <span className="text-fg-5">// </span>
            no route matched <code className="text-term-glow break-all">{location.pathname}</code>
          </p>

          <p className="mt-3 font-mono text-sm text-fg-3 leading-relaxed">
            <span className="text-fg-5">// </span>
            the page you're looking for doesn't exist, or it moved. here's what does exist:
          </p>

          {/* Valid routes */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-px bg-bg-3 border border-bg-3">
            <RouteCard
              to="/"
              label="home"
              desc="// 15 quizzes · the landing page"
            />
            <RouteCard
              to="/verify"
              label="verify a cert"
              desc="// check any cert id for authenticity"
            />
            <RouteCard
              to="/me"
              label="your dashboard"
              desc="// your earned certs + quiz history"
            />
            <RouteCard
              to="/about"
              label="about"
              desc="// why this exists · honest manifesto"
            />
          </div>

          <div className="mt-12">
            <Link to="/">
              <Button variant="primary" size="lg" cmd>back-to-home →</Button>
            </Link>
          </div>

        </div>
      </Container>
    </PageShell>
  );
}

function RouteCard({ to, label, desc }: { to: string; label: string; desc: string }) {
  return (
    <Link
      to={to}
      className="
        group bg-bg-0 hover:bg-bg-1
        p-5 sm:p-6 flex items-center justify-between gap-4
        transition-colors duration-snap
      "
    >
      <div className="min-w-0">
        <div className="font-display font-bold text-fg-0 text-base leading-tight group-hover:text-term-glow transition-colors duration-snap">
          {label}
        </div>
        <p className="mt-1.5 font-mono text-xs text-fg-3 truncate">
          {desc}
        </p>
      </div>
      <span
        aria-hidden="true"
        className="
          text-fg-5 text-lg shrink-0
          transition-all duration-fast
          group-hover:text-term-glow group-hover:translate-x-1
          motion-reduce:group-hover:translate-x-0
        "
      >
        →
      </span>
    </Link>
  );
}
