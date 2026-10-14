// ────────────────────────────────────────────────────────────
// RRRTX FreeVerse — Cert export utilities
// Pure client-side: jsPDF + html2canvas. No server.
// ────────────────────────────────────────────────────────────

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';
import type { PublicCredential } from '../types';

/** Wait until web fonts are ready so the downloaded PDF/JPG matches the preview. */
async function waitForFonts(): Promise<void> {
  try {
    const fontSet = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (fontSet?.ready) await fontSet.ready;
  } catch {
    // Font loading API is best-effort only.
  }
}

/** Wait for images inside the cert (QR + signature) before html2canvas snapshots it. */
async function waitForImages(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll('img'));
  await Promise.all(
    images.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        const done = () => resolve();
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
        // Never hang export forever because of one image.
        window.setTimeout(done, 1500);
      });
    }),
  );
}

/**
 * Capture the rendered cert element to a high-DPI canvas.
 * Shared helper for both PDF and JPG exports.
 */
async function captureCertCanvas(certEl: HTMLElement): Promise<HTMLCanvasElement> {
  await waitForFonts();
  await waitForImages(certEl);

  const rect = certEl.getBoundingClientRect();
  const width = Math.ceil(rect.width || certEl.scrollWidth);
  const height = Math.ceil(rect.height || certEl.scrollHeight);

  return html2canvas(certEl, {
    scale: Math.max(2, Math.min(3, window.devicePixelRatio || 2)),
    useCORS: true,
    allowTaint: false,
    backgroundColor: '#FBF8F3',
    logging: false,
    imageTimeout: 3000,
    removeContainer: true,
    width,
    height,
    windowWidth: Math.max(document.documentElement.clientWidth, width),
    windowHeight: Math.max(document.documentElement.clientHeight, height),
  });
}

/**
 * Generate and download the cert as a high-quality PDF at A4 landscape.
 */
export async function downloadCertificatePDF(
  certEl: HTMLElement,
  credential: PublicCredential,
): Promise<void> {
  const canvas = await captureCertCanvas(certEl);
  const imgData = canvas.toDataURL('image/png');

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });
  pdf.addImage(imgData, 'PNG', 0, 0, 297, 210);
  pdf.setProperties({
    title: `RRRTX FreeVerse — ${credential.credential.title} (${credential.credential.levelLabel})`,
    subject: `${credential.credential.title} · ${credential.credential.levelLabel}`,
    author: 'RRRTX FreeVerse',
    creator: 'RRRTX FreeVerse',
    keywords: `credential, ${credential.credential.title}, ${credential.id}`,
  });

  const safeName = credential.subject.displayName.replace(/[^a-z0-9]+/gi, '_');
  pdf.save(`RFV_${credential.credential.topicId}_${credential.credential.level}_${safeName}.pdf`);
}

/**
 * Generate and download the cert as a JPG image at 3x scale.
 * Useful for users who want to share as an image (Instagram, WhatsApp, etc.)
 */
export async function downloadCertificateJPG(
  certEl: HTMLElement,
  credential: PublicCredential,
  quality: number = 0.92,
): Promise<void> {
  const canvas = await captureCertCanvas(certEl);
  const imgData = canvas.toDataURL('image/jpeg', quality);

  const safeName = credential.subject.displayName.replace(/[^a-z0-9]+/gi, '_');
  const a = document.createElement('a');
  a.href = imgData;
  a.download = `RFV_${credential.credential.topicId}_${credential.credential.level}_${safeName}.jpg`;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * Generate a QR code data URL pointing to the verify page for this cert.
 */
export async function buildVerifyQR(credentialId: string, verifyUrl: string): Promise<string> {
  void credentialId;
  return QRCode.toDataURL(verifyUrl, {
    margin: 1,
    width: 240,
    color: { dark: '#1A1610', light: '#FBF8F3' },
  });
}

/**
 * Build a LinkedIn "Add to Profile" deep link.
 * This is the OFFICIAL LinkedIn credential-add flow — free, no API key needed.
 * LinkedIn opens a pre-filled "Add license/certification" form in the user's profile.
 */
export function buildLinkedInAddLink(credential: PublicCredential): string {
  const issuedDate = new Date(credential.issuedAt);
  const params = new URLSearchParams({
    startTask: 'CERTIFICATION_NAME',
    name: `${credential.credential.title} — ${credential.credential.levelLabel}`,
    organizationName: 'RRRTX FreeVerse',
    issueYear: String(issuedDate.getFullYear()),
    issueMonth: String(issuedDate.getMonth() + 1),
    certUrl: credential.verifyUrl,
    certId: credential.id,
  });
  return `https://www.linkedin.com/profile/add?${params.toString()}`;
}

/**
 * Build a Twitter/X share URL with cert details pre-filled.
 */
export function buildTwitterShareLink(credential: PublicCredential): string {
  const text = `I earned the ${credential.credential.title} (${credential.credential.levelLabel}) credential from RRRTX FreeVerse — free, server-graded and independently verifiable.`;
  const url = credential.verifyUrl;
  const params = new URLSearchParams({ text, url });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

/**
 * Build a WhatsApp share link.
 */
export function buildWhatsAppShareLink(credential: PublicCredential): string {
  const text = `I earned the ${credential.credential.title} (${credential.credential.levelLabel}) credential from RRRTX FreeVerse. Verify it here: ${credential.verifyUrl}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/**
 * Build a Facebook share link.
 */
export function buildFacebookShareLink(credential: PublicCredential): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(credential.verifyUrl)}`;
}
