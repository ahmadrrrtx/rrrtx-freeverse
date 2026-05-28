import { Link } from 'react-router-dom';
import { Logo } from '../atoms/Logo';
import { Container } from '../atoms/Container';

/**
 * Site header — minimal terminal style.
 * Sticky, hairline divider below, no backdrop blur (clean).
 */
export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-bg-3 bg-bg-0/90 backdrop-blur-sm">
      <Container size="marketing">
        <div className="flex h-14 items-center justify-between">
          <Logo />
          <nav className="flex items-center gap-0.5 sm:gap-2" aria-label="Primary">
            <NavLink to="/">browse</NavLink>
            <NavLink to="/verify">verify</NavLink>
            <NavLink to="/me">certs</NavLink>
            <NavLink to="/about" hideOnMobile>about</NavLink>
          </nav>
        </div>
      </Container>
    </header>
  );
}

function NavLink({
  to,
  children,
  hideOnMobile = false,
}: { to: string; children: string; hideOnMobile?: boolean }) {
  return (
    <Link
      to={to}
      className={`
        font-mono text-xs sm:text-[13px] font-medium
        text-fg-3 hover:text-fg-0
        transition-colors duration-snap
        px-2 sm:px-3 py-2
        ${hideOnMobile ? 'hidden sm:inline-flex' : ''}
      `}
    >
      <span aria-hidden="true" className="text-fg-5">/ </span>
      {children}
    </Link>
  );
}
