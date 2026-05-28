import { Link } from 'react-router-dom';
import { Container } from '../atoms/Container';

/**
 * Footer — minimal terminal style.
 * Plain text, monospace, no fancy chrome.
 * Includes legal links (privacy, terms) — required for a public site.
 */
export function Footer() {
  return (
    <footer className="border-t border-bg-3 mt-24 py-10">
      <Container size="marketing">
        <div className="
          flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between
          font-mono text-xs text-fg-4
        ">
          <p>
            // © {new Date().getFullYear()} rrrtx_freeverse · built by{' '}
            <a
              href="https://github.com/ahmadrrrtx"
              target="_blank"
              rel="noreferrer noopener"
              className="text-fg-2 hover:text-term-glow transition-colors duration-snap"
            >
              ahmad
            </a>
            {' '}· MIT
          </p>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <FooterLink to="/about">about</FooterLink>
            <FooterLink to="/verify">verify</FooterLink>
            <FooterLink to="/privacy">privacy</FooterLink>
            <FooterLink to="/terms">terms</FooterLink>
            <a
              href="https://github.com/ahmadrrrtx"
              target="_blank"
              rel="noreferrer noopener"
              className="text-fg-4 hover:text-fg-1 transition-colors duration-snap"
            >
              github
            </a>
          </div>
        </div>
      </Container>
    </footer>
  );
}

function FooterLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="text-fg-4 hover:text-fg-1 transition-colors duration-snap">
      {children}
    </Link>
  );
}
