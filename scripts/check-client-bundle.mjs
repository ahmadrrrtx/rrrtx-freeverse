#!/usr/bin/env node
// ────────────────────────────────────────────────────────────
// npm run check:client-bundle  (runs after `vite build`)
//
// The browser bundle must never contain an answer key or the
// credential-signing material. This scans the built output for:
//   • plaintext question banks (the old src/quizzes/*.json content)
//   • answer indices / explanation fields
//   • anything that looks like a secret
// It also asserts the questions really are absent, so a future
// refactor cannot quietly re-bundle them.
// ────────────────────────────────────────────────────────────

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

if (!existsSync(DIST)) {
  console.error('[check:client-bundle] dist/ not found — run `vite build` first.');
  process.exit(1);
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const files = walk(DIST).filter((f) => /\.(js|css|html|json|map)$/.test(f));
const problems = [];

// Signatures of the legacy plaintext bank (present in every old bundle).
const FORBIDDEN = [
  { pattern: /"answer"\s*:\s*[0-3]/, label: 'answer index (plaintext question bank)' },
  { pattern: /correctOptionIndex/, label: 'correctOptionIndex field' },
  { pattern: /subPools/, label: 'subPools field (legacy question bank shape)' },
  { pattern: /rrrtx-freeverse-v1-2026/, label: 'legacy public certificate salt' },
  { pattern: /ghp_[A-Za-z0-9]{20,}/, label: 'GitHub personal access token' },
  { pattern: /github_pat_[A-Za-z0-9_]{20,}/, label: 'GitHub fine-grained token' },
  { pattern: /-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----/, label: 'private key material' },
  { pattern: /FREEVERSE_SIGNING_SECRET|FREEVERSE_BANK_KEY|FREEVERSE_ISSUER_KEY|GH_REGISTRY_TOKEN/, label: 'server secret name (should not appear client-side)' },
];

for (const file of files) {
  const raw = readFileSync(file, 'utf8');
  for (const { pattern, label } of FORBIDDEN) {
    if (pattern.test(raw)) problems.push(`${file.replace(ROOT + '/', '')}: ${label}`);
  }
}

// The public catalog is expected to be present and answer-free.
const catalogPath = join(ROOT, 'src', 'data', 'bankCatalog.json');
if (!existsSync(catalogPath)) {
  problems.push('src/data/bankCatalog.json is missing — run `npm run bank:build`.');
} else {
  const catalog = readFileSync(catalogPath, 'utf8');
  if (/"answer"\s*:/.test(catalog)) problems.push('src/data/bankCatalog.json contains answer data.');
}

const totalBytes = files.reduce((sum, f) => sum + statSync(f).size, 0);
console.log(`[check:client-bundle] scanned ${files.length} files (${(totalBytes / 1024 / 1024).toFixed(2)} MB)`);
if (problems.length) {
  for (const p of problems) console.error(`  PROBLEM: ${p}`);
  console.error('[check:client-bundle] FAIL — answer keys or secrets must never ship to the browser.');
  process.exit(1);
}
console.log('[check:client-bundle] OK — no answer keys, bank contents or secrets in the client bundle.');
