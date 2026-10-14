#!/usr/bin/env node
// ────────────────────────────────────────────────────────────
// npm run integration:check
//
// Re-validates shared/learnpath-map.json against the live LearnPath
// repository. The map is generated from a recorded commit ref; this
// script proves the claim still holds (a slug was renamed, a roadmap
// dropped, or a skill we link to moved out of the roadmap).
//
// Exit codes:
//   0 — every referenced slug exists in the live repository
//   1 — the map is stale or wrong (details printed)
//   3 — the network could not be reached: *nothing was verified*
//
// It reads public content only, sends no credentials, and writes
// nothing. Use `--ref <sha>` to check against a specific commit.
// ────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const map = JSON.parse(readFileSync(join(here, '..', 'shared', 'learnpath-map.json'), 'utf8'));

const argRefIndex = process.argv.indexOf('--ref');
const ref = argRefIndex > -1 ? process.argv[argRefIndex + 1] : map.learnpath.ref;
const repo = map.learnpath.repo;

const FILES = ['src/lib/content/roadmaps.ts', 'src/lib/content/skills.ts', 'src/lib/content/skills.imported.ts'];
const BASES = [
  `https://raw.githubusercontent.com/${repo}/${ref}`,
  `https://api.github.com/repos/${repo}/contents`,
];

async function fetchFile(file) {
  const errors = [];
  for (const base of BASES) {
    const url = base.includes('api.github.com')
      ? `${base}/${file}?ref=${encodeURIComponent(ref)}`
      : `${base}/${file}`;
    try {
      const res = await fetch(url, {
        headers: base.includes('api.github.com')
          ? { Accept: 'application/vnd.github.raw', 'User-Agent': 'rrrtx-freeverse-integration-check' }
          : { 'User-Agent': 'rrrtx-freeverse-integration-check' },
        signal: AbortSignal.timeout(12000),
      });
      if (res.status === 404) {
        errors.push(`${url} → HTTP 404`);
        continue;
      }
      if (!res.ok) {
        errors.push(`${url} → HTTP ${res.status}`);
        continue;
      }
      return await res.text();
    } catch (e) {
      errors.push(`${url} → ${e?.cause?.code ?? e?.name ?? 'network error'}`);
    }
  }
  const failure = new Error(errors.join('; '));
  failure.unreachable = true;
  throw failure;
}

function parseSkills(source) {
  const out = new Map();
  const re = /\n\s*id:\s*"([a-z0-9-]+)",\s*\n\s*slug:\s*"([a-z0-9-]+)",\s*\n\s*title:\s*"([^"]+)",/g;
  for (const match of source.matchAll(re)) out.set(match[1], { slug: match[2], title: match[3] });
  return out;
}

function parseRoadmaps(source) {
  const out = new Map();
  const blocks = source.split(/\n {2}\{\n {4}id: "/).slice(1);
  for (const block of blocks) {
    const id = block.slice(0, block.indexOf('"'));
    const title = /\n\s*title:\s*"([^"]+)"/.exec(block)?.[1] ?? id;
    const skills = [...new Set([...block.matchAll(/skillId:\s*"([a-z0-9-]+)"/g)].map((m) => m[1]))].sort();
    out.set(id, { title, skills });
  }
  return out;
}

console.log(`[integration:check] ${repo}@${ref} (recorded ref: ${map.learnpath.ref})`);

let sources;
try {
  sources = await Promise.all(FILES.map(fetchFile));
} catch (e) {
  console.log(`RESULT: learnpath-unreachable — ${e.message}`);
  console.log('        Nothing was verified. Re-run from a network that can reach github.com.');
  process.exit(3);
}

const [roadmapsSrc, skillsSrc, importedSrc] = sources;
const liveSkills = new Map([...parseSkills(skillsSrc), ...parseSkills(importedSrc)]);
const liveRoadmaps = parseRoadmaps(roadmapsSrc);

if (liveSkills.size === 0 || liveRoadmaps.size === 0) {
  console.log('RESULT: learnpath-unparseable — fetched files did not contain the expected taxonomy shape.');
  process.exit(3);
}

const problems = [];

// 1. Every slug we reference must exist, and must be a node of the roadmap we link from.
for (const mapping of map.mappings) {
  for (const entry of mapping.entries) {
    const roadmap = liveRoadmaps.get(entry.roadmap);
    if (!roadmap) {
      problems.push(`${mapping.topicId}: roadmap "${entry.roadmap}" no longer exists`);
      continue;
    }
    for (const skillId of entry.skills) {
      if (!liveSkills.has(skillId)) {
        problems.push(`${mapping.topicId}: skill "${skillId}" is no longer published by LearnPath`);
        continue;
      }
      if (!roadmap.skills.includes(skillId)) {
        problems.push(`${mapping.topicId}: skill "${skillId}" is no longer a node of "${entry.roadmap}"`);
      }
    }
  }
}

// 2. Every sub-skill deep link must still be a node of its roadmap.
for (const [topicId, deep] of Object.entries(map.deepLinks)) {
  const roadmap = liveRoadmaps.get(deep.roadmap);
  if (!roadmap) {
    problems.push(`${topicId}: deep-link roadmap "${deep.roadmap}" no longer exists`);
    continue;
  }
  for (const [freeverseSkillId, learnpathSkillId] of Object.entries(deep.skills)) {
    if (!liveSkills.has(learnpathSkillId)) {
      problems.push(`${topicId}/${freeverseSkillId}: deep link → "${learnpathSkillId}" no longer published`);
    } else if (!roadmap.skills.includes(learnpathSkillId)) {
      problems.push(`${topicId}/${freeverseSkillId}: deep link → "${learnpathSkillId}" is not a node of "${deep.roadmap}"`);
    }
  }
}

const referenced = new Set([
  ...map.mappings.flatMap((m) => m.entries.flatMap((e) => e.skills)),
  ...Object.values(map.deepLinks).flatMap((d) => Object.values(d.skills)),
]);

console.log(`[integration:check] live taxonomy: ${liveRoadmaps.size} roadmaps, ${liveSkills.size} skills`);
console.log(`[integration:check] referenced by this repo: ${referenced.size} skills across ${map.mappings.length} mapped topics`);

if (problems.length > 0) {
  console.log('RESULT: stale-mapping');
  for (const p of problems) console.log(`  • ${p}`);
  console.log('        Fix shared/learnpath-map.json (and shared/learnpath.ts consumers) before shipping links.');
  process.exit(1);
}

const moved = referenced.size !== new Set(referenced).size ? [] : [];
void moved;
console.log(`RESULT: mapping-valid — every referenced LearnPath skill exists in ${repo}@${ref}`);
process.exit(0);
