// ────────────────────────────────────────────────────────────
// RRRTX FreeVerse — Cert export utilities
// Pure client-side: jsPDF + html2canvas. No server.
// ────────────────────────────────────────────────────────────

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';
import type { Certificate } from '../types';

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
  cert: Certificate,
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
    title: `RRRTX FreeVerse — ${cert.quiz.title}`,
    subject: cert.quiz.title,
    author: 'RRRTX FreeVerse',
    creator: 'RRRTX FreeVerse',
    keywords: `certification, ${cert.quiz.title}, ${cert.id}`,
  });

  const safeName = cert.recipient.name.replace(/[^a-z0-9]+/gi, '_');
  pdf.save(`RFV_${cert.quiz.id}_${safeName}.pdf`);
}

/**
 * Generate and download the cert as a JPG image at 3x scale.
 * Useful for users who want to share as an image (Instagram, WhatsApp, etc.)
 */
export async function downloadCertificateJPG(
  certEl: HTMLElement,
  cert: Certificate,
  quality: number = 0.92,
): Promise<void> {
  const canvas = await captureCertCanvas(certEl);
  const imgData = canvas.toDataURL('image/jpeg', quality);

  const safeName = cert.recipient.name.replace(/[^a-z0-9]+/gi, '_');
  const a = document.createElement('a');
  a.href = imgData;
  a.download = `RFV_${cert.quiz.id}_${safeName}.jpg`;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * Generate a QR code data URL pointing to the verify page for this cert.
 */
export async function buildVerifyQR(certId: string, baseUrl: string): Promise<string> {
  const verifyUrl = `${baseUrl}/verify?id=${certId}`;
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
export function buildLinkedInAddLink(cert: Certificate, baseUrl: string): string {
  const issuedDate = new Date(cert.issued_at);
  const params = new URLSearchParams({
    startTask: 'CERTIFICATION_NAME',
    name: cert.quiz.title,
    organizationName: 'RRRTX FreeVerse',
    issueYear: String(issuedDate.getFullYear()),
    issueMonth: String(issuedDate.getMonth() + 1),
    certUrl: `${baseUrl}/verify?id=${cert.id}`,
    certId: cert.id,
  });
  return `https://www.linkedin.com/profile/add?${params.toString()}`;
}

/**
 * Build a Twitter/X share URL with cert details pre-filled.
 */
export function buildTwitterShareLink(cert: Certificate, baseUrl: string): string {
  const text = `I just earned the ${cert.quiz.title} certificate from @rrrtx_freeverse — a 100% free, cryptographically verifiable cert. Score: ${cert.score}/100.`;
  const url = `${baseUrl}/cert/${cert.id}`;
  const params = new URLSearchParams({ text, url });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

/**
 * Build a WhatsApp share link.
 */
export function buildWhatsAppShareLink(cert: Certificate, baseUrl: string): string {
  const text = `I just earned my ${cert.quiz.title} certificate (score: ${cert.score}/100) from RRRTX FreeVerse. Verify it here: ${baseUrl}/cert/${cert.id}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/**
 * Build a Facebook share link.
 */
export function buildFacebookShareLink(cert: Certificate, baseUrl: string): string {
  const url = `${baseUrl}/cert/${cert.id}`;
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}
