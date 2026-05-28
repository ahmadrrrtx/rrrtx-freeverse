import { StatusDot } from '../atoms/StatusDot';
import { Container } from '../atoms/Container';

interface StatusBarItemProps {
  label: string;
  value: string;
}

/**
 * Terminal-style status bar.
 * Sits under the header on landing pages. Displays system state.
 * Mobile: horizontally scrollable so all items remain accessible.
 */
export function StatusBar() {
  return (
    <div className="border-b border-bg-3">
      <Container size="marketing">
        <div className="
          flex items-center gap-x-6 gap-y-2 overflow-x-auto py-3
          font-mono text-[11px] uppercase tracking-widest text-fg-4
          [-ms-overflow-style:none] [scrollbar-width:none]
          [&::-webkit-scrollbar]:hidden
        ">
          <span className="flex items-center gap-2 whitespace-nowrap">
            <StatusDot state="online" />
            <span className="text-fg-2">status:</span>
            <span className="text-term-glow">online</span>
          </span>
          <StatusBarItem label="version" value="v1.0.0" />
          <StatusBarItem label="quizzes" value="15" />
          <StatusBarItem label="questions" value="1,500" />
          <StatusBarItem label="cost" value="$0" />
        </div>
      </Container>
    </div>
  );
}

function StatusBarItem({ label, value }: StatusBarItemProps) {
  return (
    <span className="flex items-center gap-2 whitespace-nowrap">
      <span className="text-fg-2">{label}:</span>
      <span className="text-fg-1">{value}</span>
    </span>
  );
}
