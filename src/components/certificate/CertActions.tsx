import { useState } from 'react';
import { Button } from '../atoms/Button';
import {
  downloadCertificatePDF,
  downloadCertificateJPG,
  buildLinkedInAddLink,
  buildTwitterShareLink,
  buildWhatsAppShareLink,
  buildFacebookShareLink,
} from '../../lib/pdfGenerator';
import type { Certificate as CertificateRecord } from '../../types';
import { cn } from '../../lib/cn';

interface CertActionsProps {
  paperEl: HTMLElement | null;
  cert: CertificateRecord;
  baseUrl: string;
}

/**
 * CertActions — download + share toolbar.
 *
 * Layout:
 *   Row 1 — Primary actions: [Download PDF] [Download JPG]
 *   Row 2 — Share network: LinkedIn (primary) · X · WhatsApp · Facebook · Copy Link
 *
 * Mobile: stacks vertically. Desktop: side by side.
 */
export function CertActions({ paperEl, cert, baseUrl }: CertActionsProps) {
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingJpg, setDownloadingJpg] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleDownloadPDF() {
    if (!paperEl) return;
    setDownloadingPdf(true);
    try {
      await downloadCertificatePDF(paperEl, cert);
    } catch (e) {
      console.error(e);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setDownloadingPdf(false);
    }
  }

  async function handleDownloadJPG() {
    if (!paperEl) return;
    setDownloadingJpg(true);
    try {
      await downloadCertificateJPG(paperEl, cert);
    } catch (e) {
      console.error(e);
      alert('Failed to generate image. Please try again.');
    } finally {
      setDownloadingJpg(false);
    }
  }

  function handleCopyLink() {
    const url = `${baseUrl}/cert/${cert.id}`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const linkedInUrl = buildLinkedInAddLink(cert, baseUrl);
  const twitterUrl  = buildTwitterShareLink(cert, baseUrl);
  const whatsappUrl = buildWhatsAppShareLink(cert, baseUrl);
  const facebookUrl = buildFacebookShareLink(cert, baseUrl);

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* ROW 1 — DOWNLOADS */}
      <div>
        <div className="font-mono text-[11px] uppercase tracking-widest text-fg-4 mb-3">
          <span className="text-fg-5">// </span>download
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Button
            variant="primary"
            size="lg"
            cmd
            loading={downloadingPdf}
            onClick={handleDownloadPDF}
            disabled={!paperEl}
          >
            download-pdf
          </Button>
          <Button
            variant="ghost"
            size="lg"
            cmd
            loading={downloadingJpg}
            onClick={handleDownloadJPG}
            disabled={!paperEl}
          >
            download-jpg
          </Button>
        </div>
      </div>

      {/* ROW 2 — SHARE */}
      <div>
        <div className="font-mono text-[11px] uppercase tracking-widest text-fg-4 mb-3">
          <span className="text-fg-5">// </span>share
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* LinkedIn — primary share button (largest) */}
          <a
            href={linkedInUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="
              inline-flex items-center gap-2.5
              h-11 px-4 sm:px-5
              border border-[#0A66C2] bg-[#0A66C2] text-white
              font-mono text-xs sm:text-sm font-medium
              hover:bg-[#004182] hover:border-[#004182]
              transition-colors duration-snap
            "
            aria-label="Add to LinkedIn profile"
          >
            <LinkedInIcon />
            <span>add to linkedin</span>
          </a>

          {/* X / Twitter */}
          <ShareIconButton
            href={twitterUrl}
            label="share on x"
          >
            <XIcon />
          </ShareIconButton>

          {/* WhatsApp */}
          <ShareIconButton
            href={whatsappUrl}
            label="share on whatsapp"
          >
            <WhatsAppIcon />
          </ShareIconButton>

          {/* Facebook */}
          <ShareIconButton
            href={facebookUrl}
            label="share on facebook"
          >
            <FacebookIcon />
          </ShareIconButton>

          {/* Copy link */}
          <button
            type="button"
            onClick={handleCopyLink}
            className={cn(
              'inline-flex items-center gap-2',
              'h-11 px-3 sm:px-4',
              'border font-mono text-xs sm:text-sm',
              'transition-colors duration-snap',
              copied
                ? 'border-term-glow bg-term-soft text-term-glow'
                : 'border-bg-3 text-fg-1 hover:border-fg-1 hover:bg-bg-1',
            )}
          >
            {copied ? (
              <>
                <CheckIcon />
                <span>copied</span>
              </>
            ) : (
              <>
                <LinkIcon />
                <span className="hidden sm:inline">copy link</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────
function ShareIconButton({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={label}
      title={label}
      className="
        inline-flex items-center justify-center
        h-11 w-11
        border border-bg-3 text-fg-1
        hover:border-fg-1 hover:bg-bg-1
        transition-colors duration-snap
      "
    >
      {children}
    </a>
  );
}

// ──────────────────────────────────────────────────────────
// Inline icons (no external icon library load)
// ──────────────────────────────────────────────────────────
function LinkedInIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.852 3.37-1.852 3.601 0 4.267 2.37 4.267 5.455v6.288zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
}
function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}
function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.515 5.26l.36.572-1.003 3.668 3.769-.988zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
    </svg>
  );
}
function FacebookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 011.141.195v3.325a8.623 8.623 0 00-.653-.036 26.805 26.805 0 00-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 00-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647z"/>
    </svg>
  );
}
function LinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
