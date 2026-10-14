#!/usr/bin/env node
// ────────────────────────────────────────────────────────────
// npm run issuer:keygen
//
// Creates the Ed25519 key pair used to sign credential records and
// writes it to .env.local (gitignored). The private key is printed
// NOWHERE else and must never be committed.
//
// After running this:
//   1. copy the FREEVERSE_ISSUER_KEY value into the Vercel project
//      environment variables (Production + Preview),
//   2. keep a copy in a password manager — rotating it later means
//      a new key id, and old credentials stay verifiable because
//      the public key stays published in the registry.
// ────────────────────────────────────────────────────────────

import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateKeyPairSync } from 'node:crypto';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENV_LOCAL = join(ROOT, '.env.local');

const { privateKey } = generateKeyPairSync('ed25519');
const pkcs8 = privateKey.export({ format: 'der', type: 'pkcs8' });
const seed = Buffer.from(pkcs8.subarray(pkcs8.length - 32)).toString('base64url');

if (existsSync(ENV_LOCAL) && readFileSync(ENV_LOCAL, 'utf8').includes('FREEVERSE_ISSUER_KEY=')) {
  console.error('[issuer:keygen] .env.local already contains FREEVERSE_ISSUER_KEY — refusing to overwrite.');
  console.error('                Remove that line first if you really intend to rotate the issuer key.');
  process.exit(1);
}

appendFileSync(
  ENV_LOCAL,
  [
    '',
    '# ── RRRTX FreeVerse — local development secrets (gitignored) ──',
    '# Copy these values into your hosting provider; never commit them.',
    `FREEVERSE_ISSUER_KEY=${seed}`,
    '',
  ].join('\n'),
);

console.log('[issuer:keygen] Wrote a new Ed25519 issuer key to .env.local (gitignored).');
console.log('                1. Copy FREEVERSE_ISSUER_KEY into your production environment variables.');
console.log('                2. Run `npm run issuer:keygen` again only to rotate.');
console.log('                3. The public key is published automatically on the first issuance.');
