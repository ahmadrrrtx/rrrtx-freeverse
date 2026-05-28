// ────────────────────────────────────────────────────────────
// RRRTX FreeVerse — Cryptographic utilities
// Uses Web Crypto API (built into every modern browser)
// No npm dependencies, no server needed, fully Vercel-compatible
// ────────────────────────────────────────────────────────────

const CURRENT_SALT = 'rrrtx-freeverse-v1-2026';
const OLD_SALTS: string[] = []; // add old salts here when rotating

/**
 * Compute SHA-256 hash of a string, return hex.
 */
export async function sha256(input: string): Promise<string> {
  const buffer = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate a deterministic certificate ID from user + quiz + score + date + integrity.
 * Same inputs always produce the same ID — user can re-verify their own cert anytime.
 * Integrity (violations + completion mode) is baked in so the cert encodes how it was earned.
 */
export async function generateCertId(args: {
  name: string;
  email: string;
  quizId: string;
  score: number;
  dateISO: string; // YYYY-MM-DD portion is used
  integrityHash: string; // hash of integrity data, see below
  salt?: string;
}): Promise<string> {
  const salt = args.salt ?? CURRENT_SALT;
  const dayPart = args.dateISO.slice(0, 10);
  const yearPart = args.dateISO.slice(0, 4);
  const normalized = [
    args.name.toLowerCase().trim(),
    args.email.toLowerCase().trim(),
    args.quizId,
    String(args.score),
    dayPart,
    args.integrityHash,
    salt,
  ].join('|');
  const hash = await sha256(normalized);
  return `RFV-${yearPart}-${hash.slice(0, 8).toUpperCase()}`;
}

/**
 * Verify a cert ID against the same inputs. Returns true if the hash matches.
 * Tries the current salt first, then any old salts.
 */
export async function verifyCertId(args: {
  certId: string;
  name: string;
  email: string;
  quizId: string;
  score: number;
  dateISO: string;
  integrityHash: string;
}): Promise<boolean> {
  const saltsToTry = [CURRENT_SALT, ...OLD_SALTS];
  for (const salt of saltsToTry) {
    const candidate = await generateCertId({ ...args, salt });
    if (candidate === args.certId) return true;
  }
  return false;
}

/**
 * Hash the integrity signals (violations + secure mode completion) into a short string
 * that gets baked into the cert ID. Tampering with violation count breaks verification.
 */
export async function hashIntegrity(args: {
  violations: number;
  completedInSecureMode: boolean;
}): Promise<string> {
  const s = `v=${args.violations}|sm=${args.completedInSecureMode ? '1' : '0'}`;
  const h = await sha256(s);
  return h.slice(0, 8);
}

/**
 * Hash an email for privacy-preserving storage in the GitHub registry.
 */
export async function hashEmail(email: string): Promise<string> {
  const hash = await sha256(`email:${email.toLowerCase().trim()}`);
  return `sha256:${hash}`;
}

/**
 * URL-safe username slug.
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
