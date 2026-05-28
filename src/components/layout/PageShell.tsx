import { type ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { StatusBar } from './StatusBar';

interface PageShellProps {
  children: ReactNode;
  /** Show the terminal status bar under the header (landing only) */
  showStatus?: boolean;
}

/**
 * Standard page chrome: header + (optional status bar) + content + footer.
 * 100dvh minimum, bg-0 background.
 */
export function PageShell({ children, showStatus = false }: PageShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg-0">
      <Header />
      {showStatus && <StatusBar />}
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
