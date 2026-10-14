#!/usr/bin/env node
// ────────────────────────────────────────────────────────────
// npm run registry:verify -- RFV-2026-XXXXXXXX
//
// Independent verification of a credential record, without this
// application: fetches the record from the public registry, strips
// the signature, canonicalises the rest and verifies it with the
// published issuer public key. Anyone (a recruiter, an auditor, a
// competitor) can run this — that is the point of publishing the
// key.
// ────────────────────────────────────────────────────────────

import { createPublicKey, verify } from 'node:crypto';

const repoEnv = process.env.FREEVERSE_REGISTRY_REPO ?? 'ahmadrrrtx/rrrtx-freeverse-certs';
const branch = process.env.FREEVERSE_REGISTRY_BRANCH ?? 'main';
const id = (process.argv[2] ?? '').trim().toUpperCase();
// Recipient names are personal data: masked unless explicitly requested.
const showSubject = process.argv.includes('--show-subject');
const mask = (name) => (showSubject || !name ? String(name ?? 'unknown') : `${name.slice(0, 1)}${'•'.repeat(Math.max(2, Math.min(8, name.length - 2)))}${name.slice(-1)}`);

if (!/^RFV-\d{4}-[A-F0-9]{8}$/.test(id)) {
  console.error('Usage: npm run registry:verify -- RFV-YYYY-XXXXXXXX');
  process.exit(2);
}

function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
}

const year = /^RFV-(\d{4})-/.exec(id)[1];
const base = `https://raw.githubusercontent.com/${repoEnv}/${branch}`;

async function getJson(path) {
  let res;
  try {
    res = await fetch(`${base}/${path}`, { signal: AbortSignal.timeout(10000) });
  } catch (e) {
    // Network-level failure (offline, DNS, TLS interception, blocked host):
    // report it as such instead of dumping a stack trace — "cannot check" and
    // "not valid" are different answers.
    console.log(`RESULT: registry-unreachable — could not fetch ${path} (${e?.cause?.code ?? e?.name ?? 'network error'})`);
    console.log('        Nothing about this credential was verified. Retry from a network that can reach raw.githubusercontent.com.');
    process.exit(3);
  }
  if (res.status === 404) return null;
  if (!res.ok) {
    console.log(`RESULT: registry-unreachable — ${path} returned HTTP ${res.status}`);
    process.exit(3);
  }
  try {
    return await res.json();
  } catch {
    console.log(`RESULT: registry-corrupt — ${path} is not valid JSON`);
    process.exit(3);
  }
}

let record = null;
let path = null;
for (let month = 1; month <= 12 && !record; month += 1) {
  const candidate = `certs/${year}/${String(month).padStart(2, '0')}/${id}.json`;
  record = await getJson(candidate);
  if (record) path = candidate;
}
if (!record) {
  console.log(`RESULT: not-found — no record for ${id} in ${repoEnv}.`);
  process.exit(1);
}

console.log(`record      : ${repoEnv}/${path}`);
console.log(`subject     : ${mask(record.subject?.display_name ?? record.recipient?.name)} (masked; add --show-subject to reveal)`);
console.log(`credential  : ${record.credential?.title ?? record.quiz?.title ?? 'unknown'}` +
  (record.credential?.level_label ? ` · ${record.credential.level_label}` : ''));
console.log(`score       : ${record.assessment?.score ?? record.score ?? '?'} (pass ${record.assessment?.passing_score ?? 'n/a'})`);
console.log(`issued      : ${record.issued_at}`);

const revocations = (await getJson('revocations.json')) ?? { revoked: [] };
const revoked = (revocations.revoked ?? []).find((r) => r.id === id);
if (revoked) {
  console.log(`status      : REVOKED on ${revoked.revoked_at} — ${revoked.reason}`);
} else {
  console.log('status      : not listed in revocations.json');
}

if (!record.signature?.value) {
  console.log('signature   : none (legacy record issued before server-side signing)');
  console.log('RESULT: registry-record-present-but-unverified');
  process.exit(0);
}

const keyRecord = await getJson(`issuer-keys/${record.signature.key_id}.json`);
if (!keyRecord?.public_key_pem) {
  console.log(`signature   : cannot check — public key ${record.signature.key_id} not published`);
  console.log('RESULT: unverified');
  process.exit(1);
}

const unsigned = { ...record };
delete unsigned.signature;
const ok = verify(null, Buffer.from(canonical(unsigned), 'utf8'), createPublicKey(keyRecord.public_key_pem), Buffer.from(record.signature.value, 'base64url'));

console.log(`signature   : ${ok ? 'VALID' : 'INVALID'} (${record.signature.key_id}, ${record.signature.signed_fields})`);
console.log(`RESULT: ${ok ? (revoked ? 'signature-valid-but-revoked' : 'signature-valid') : 'signature-invalid'}`);
process.exit(ok ? 0 : 1);
