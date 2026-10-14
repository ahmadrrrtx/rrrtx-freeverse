#!/usr/bin/env node
// ────────────────────────────────────────────────────────────
// npm run bank:check  (runs inside `npm run build`)
//
// Pre-deploy guard for the sealed question bank. Fails the build
// when the assessment engine could not grade correctly in
// production — better a failed build than a silently broken or
// insecure assessment.
// ────────────────────────────────────────────────────────────

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BANK_DIR = join(ROOT, 'server', 'bank');
const DEV_KEY = 'rfv-dev-bank-key-not-for-production';
const devKeyId = createHash('sha256').update(DEV_KEY, 'utf8').digest('hex').slice(0, 8);

const problems = [];
const notes = [];

if (!existsSync(join(BANK_DIR, 'manifest.json'))) {
  problems.push('server/bank/manifest.json is missing — run `npm run bank:build`.');
} else {
  const manifest = JSON.parse(readFileSync(join(BANK_DIR, 'manifest.json'), 'utf8'));
  const sealedFiles = readdirSync(BANK_DIR).filter((f) => f.endsWith('.sealed.json'));

  if (manifest.topics.length !== sealedFiles.length) {
    problems.push(`manifest lists ${manifest.topics.length} topics but ${sealedFiles.length} sealed files exist — rebuild the bank.`);
  }

  for (const topic of manifest.topics) {
    if (!existsSync(join(BANK_DIR, `${topic.id}.sealed.json`))) problems.push(`missing sealed file for topic "${topic.id}".`);
    if (!topic.levels || !Object.keys(topic.levels).length) problems.push(`topic "${topic.id}" has no level availability data.`);
    const available = Object.values(topic.levels).some((l) => l.available);
    if (!available) problems.push(`topic "${topic.id}" has no servable level (every attempt would fail).`);
    if (topic.quality.assessmentIntegrity !== 'verified') {
      notes.push(`topic "${topic.id}" is under assessment-quality review (longest-option baseline ${(topic.quality.servableBaseline * 100).toFixed(0)}%).`);
    }
  }

  if (manifest.keyId === devKeyId) {
    notes.push('The bank is sealed with the public DEVELOPMENT key: production grading will be refused until you run `FREEVERSE_BANK_KEY=<secret> npm run bank:build`.');
  }

  // A sealed file must never contain a plaintext answer key.
  for (const file of sealedFiles.slice(0, 15)) {
    const raw = readFileSync(join(BANK_DIR, file), 'utf8');
    if (/"answer"\s*:/.test(raw) || /"explanation"\s*:/.test(raw)) {
      problems.push(`${file} contains a plaintext answer key. Rebuild the bank with scripts/build-bank.mjs.`);
    }
  }
}

const status = problems.length ? 'FAIL' : 'OK';
console.log(`[bank:check] ${status}`);
for (const note of notes) console.log(`  note: ${note}`);
for (const problem of problems) console.error(`  PROBLEM: ${problem}`);
if (problems.length) process.exit(1);
