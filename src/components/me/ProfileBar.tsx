import { useRef, useState } from 'react';
import { Button } from '../atoms/Button';
import { exportAll, importAll } from '../../lib/storage';
import type { UserProfile } from '../../types';

interface ProfileBarProps {
  user: UserProfile | null;
  onImportSuccess: () => void;
}

/**
 * ProfileBar — top of /me page.
 * Shows user identity + Export/Import controls.
 *
 * Export: downloads a JSON file with everything (user + certs + results)
 * Import: file picker → validates → updates localStorage → calls onImportSuccess
 */
export function ProfileBar({ user, onImportSuccess }: ProfileBarProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');

  function handleExport() {
    const json = exportAll();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rrrtx-freeverse-data-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const ok = importAll(text);
      setImportStatus(ok ? 'success' : 'error');
      if (ok) {
        onImportSuccess();
      }
      setTimeout(() => setImportStatus('idle'), 3000);
    };
    reader.readAsText(file);
    // Reset so the same file can be re-imported if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <section className="border border-bg-3 bg-bg-1">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 sm:gap-6 p-5 sm:p-6">
        {/* LEFT — profile */}
        <div className="min-w-0">
          <div className="font-mono text-[11px] uppercase tracking-widest text-fg-4">
            <span className="text-fg-5">// </span>profile
          </div>
          {user ? (
            <>
              <h2 className="
                mt-2 font-display font-bold text-fg-0
                text-xl sm:text-2xl leading-tight tracking-[-0.015em] truncate
              ">
                {user.name}
              </h2>
              <p className="mt-1 font-mono text-xs text-fg-3 truncate">
                {user.email}
              </p>
            </>
          ) : (
            <>
              <h2 className="
                mt-2 font-display font-bold text-fg-3
                text-xl sm:text-2xl leading-tight tracking-[-0.015em]
              ">
                No profile yet
              </h2>
              <p className="mt-1 font-mono text-xs text-fg-4">
                start a quiz to set your name + email
              </p>
            </>
          )}
        </div>

        {/* RIGHT — actions */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center">
          <Button variant="ghost" size="sm" onClick={handleExport}>
            ↓ export
          </Button>
          <Button variant="ghost" size="sm" onClick={handleImportClick}>
            ↑ import
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
            aria-label="Import JSON file"
          />
        </div>
      </div>

      {/* Import status row */}
      {importStatus !== 'idle' && (
        <div className={`border-t border-bg-3 px-5 sm:px-6 py-3 font-mono text-xs ${
          importStatus === 'success' ? 'text-term-glow' : 'text-err-500'
        }`}>
          {importStatus === 'success'
            ? '✓ import successful · page will refresh'
            : '✗ import failed · file may be invalid'}
        </div>
      )}
    </section>
  );
}
