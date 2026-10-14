// ────────────────────────────────────────────────────────────
// RRRTX FreeVerse — server crypto primitives
//
// Everything here runs only on the server. No value returned by
// these helpers may be serialised into an HTTP response except
// the explicitly public ones (Ed25519 public key, signatures,
// opaque item refs).
// ────────────────────────────────────────────────────────────

import { createHash, createHmac, createPrivateKey, createPublicKey, hkdfSync, randomBytes, sign as nodeSign, timingSafeEqual, verify as nodeVerify, createDecipheriv, KeyObject } from 'node:crypto';

const TE = new TextEncoder();

/** Stable JSON: object keys sorted, no insignificant whitespace. */
export function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical(obj[k])}`).join(',')}}`;
}

export function hkdf(keyMaterial: string, info: string, length = 32): Buffer {
  return Buffer.from(
    hkdfSync('sha256', Buffer.from(keyMaterial, 'utf8'), Buffer.from('rfv-bank-v1', 'utf8'), Buffer.from(info, 'utf8'), length),
  );
}

export function hmacHex(key: Buffer | string, message: string, length = 32): string {
  return createHmac('sha256', key).update(message, 'utf8').digest('hex').slice(0, length);
}

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

export function base64urlEncode(input: string | Buffer | Uint8Array): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : Buffer.from(input);
  return buf.toString('base64url');
}

export function base64urlDecode(input: string): Buffer | null {
  try {
    return Buffer.from(input, 'base64url');
  } catch {
    return null;
  }
}

/** Constant-time string comparison that does not leak length via early return. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function randomToken(bytes = 32): string {
  return base64urlEncode(randomBytes(bytes));
}

// ── Sealed-bank helpers (must match scripts/lib/bank.mjs) ───
export const ANSWER_COMMIT_DOMAIN = 'rfv.answer.v1';

export function answerCommit(key: Buffer, questionId: string, optionIndex: number, optionText: string): string {
  return `hmac-sha256:${hmacHex(key, `${ANSWER_COMMIT_DOMAIN}|${questionId}|${optionIndex}|${optionText}`)}`;
}

/** Decrypt a sealed explanation. Returns null when the key/format is unusable. */
export function decryptExplanation(key: Buffer, blob: string): string | null {
  try {
    const [format, ivB64, ctB64] = String(blob).split(':');
    if (format !== 'aes-256-gcm.v1' || !ivB64 || !ctB64) return null;
    const iv = Buffer.from(ivB64, 'base64url');
    const body = Buffer.from(ctB64, 'base64url');
    const ct = body.subarray(0, body.length - 16);
    const tag = body.subarray(body.length - 16);
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

/** Opaque, stable-per-deployment reference for a bank item. */
export function itemRef(key: Buffer, bankVersion: string, questionId: string): string {
  return hmacHex(key, `rfv.item-ref.v1|${bankVersion}|${questionId}`, 24);
}

/** Pseudonymous learner reference: cannot be reversed to an email without the key. */
export function learnerRefFromEmail(keyMaterial: string, email: string): string {
  const key = hkdf(keyMaterial, 'learner-ref');
  return `hmac-sha256:${hmacHex(key, `rfv.learner.v1|${String(email).trim().toLowerCase()}`)}`;
}

/** Identity binding: name + email, so a result cannot be transferred to another person. */
export function recipientRef(keyMaterial: string, displayName: string, email: string): string {
  const key = hkdf(keyMaterial, 'recipient-ref');
  const normalized = `${String(displayName).trim().toLowerCase().replace(/\s+/g, ' ')}|${String(email).trim().toLowerCase()}`;
  return `hmac-sha256:${hmacHex(key, `rfv.recipient.v1|${normalized}`)}`;
}

// ── Ed25519 credential signing ──────────────────────────────
export interface IssuerKey {
  keyId: string;
  privateKey: KeyObject;
  publicKeyJwk: Record<string, unknown>;
  publicKeyPem: string;
}

/**
 * Load the issuer signing key from a base64url-encoded 32-byte Ed25519 seed
 * or a PKCS#8 PEM. Returns null when unset/invalid — callers must then refuse
 * to issue (fail closed), never fall back to an unsigned record.
 */
export function loadIssuerKey(seedBase64url: string | null): IssuerKey | null {
  if (!seedBase64url) return null;
  try {
    let privateKey: KeyObject;
    const trimmed = seedBase64url.trim();
    if (trimmed.includes('BEGIN')) {
      privateKey = createPrivateKey({ key: trimmed, format: 'pem' });
    } else {
      const raw = Buffer.from(trimmed, 'base64url');
      if (raw.length !== 32) return null;
      // Wrap the raw Ed25519 seed in a PKCS#8 container.
      const der = Buffer.concat([
        Buffer.from('302e020100300506032b657004220420', 'hex'),
        raw,
      ]);
      privateKey = createPrivateKey({ key: der, format: 'der', type: 'pkcs8' });
    }
    if (privateKey.asymmetricKeyType !== 'ed25519') return null;
    const publicKey = createPublicKey(privateKey);
    const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
    const publicKeyJwk = publicKey.export({ format: 'jwk' }) as Record<string, unknown>;
    const keyId = `ed25519:${sha256Hex(publicKeyPem).slice(0, 16)}`;
    return { keyId, privateKey, publicKeyJwk, publicKeyPem };
  } catch {
    return null;
  }
}

export function signEd25519(key: IssuerKey, message: string): string {
  return base64urlEncode(nodeSign(null, TE.encode(message), key.privateKey));
}

export function verifyEd25519(publicKeyPem: string, message: string, signatureB64url: string): boolean {
  try {
    const signature = Buffer.from(signatureB64url, 'base64url');
    const key = createPublicKey(publicKeyPem);
    if (key.asymmetricKeyType !== 'ed25519') return false;
    return nodeVerify(null, TE.encode(message), key, signature);
  } catch {
    return false;
  }
}
