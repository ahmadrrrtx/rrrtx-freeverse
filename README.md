# 🎓 RRRTX FreeVerse

> **Real skills. Real certificates. Forever free.**

A free assessment platform: pick a topic and a level, take a 20-question attempt that the **server** draws, get graded against a private answer key, and — if you pass — receive an Ed25519-signed certificate with a QR code that anyone can check against a public registry. No account, no paywall, no database, no paid API.

Status: **v2.0.0**. The assessment lifecycle is server-authoritative; see [`SECURITY_AUDIT.md`](./SECURITY_AUDIT.md) for what that does and does not protect against, and [`ASSESSMENT_QUALITY.md`](./ASSESSMENT_QUALITY.md) for the measured state of the question bank (short version: usable, honest about its gaps, and in need of item rewriting).

---

## ⚡ What is actually different

| | RRRTX FreeVerse |
|---|---|
| Price | **$0** — no paywall, no upsell, no lead funnel |
| Grading | Server-side, against a sealed answer key; the browser never receives an answer |
| Issuance | Only from a signed passing attempt; the credential id is derived from a server nonce |
| Verification | Ed25519 signature + revocation list; `valid · revoked · not-found · invalid-id · registry-unavailable · unauthenticated-record` |
| Registry | A public GitHub repository — anyone can audit every credential ever issued |
| Honest limits | Not accredited, not proctored, item bank publicly marked as under review |

Not claimed anywhere: accreditation, employer recognition, cheat-proofing, or that the pass mark corresponds to a calibrated ability level. Read the disclosure on any credential page before relying on it.

---

## 🏗️ Architecture

```
Browser (React SPA on Vercel)
   │  POST /api/attempt     ──► server draws 20 items from the sealed bank
   │  ◄── prompts + options (no answers) + signed attempt token
   │  POST /api/grade       ──► server grades against keyed answer commitments
   │  ◄── result + signed result token
   │  POST /api/credential  ──► create-once write of a signed record
   │  GET  /api/verify?id=  ──► registry read + signature + revocation check
   ▼
github.com/ahmadrrrtx/rrrtx-freeverse-certs   (public, append-only registry)
```

No database. State lives in three places: signed tokens (attempts/results), the public registry (credentials, revocations, per-learner pseudonymous history), and the learner's own browser storage (display only — every badge is re-checked against `/api/verify`).

**Total monthly cost:** $0 on Vercel's free tier + a public GitHub repository.

---

## 🧠 The assessment system

- **15 topics**, **100 items** each (1,500 total), grouped into **20 skill areas** per topic
- Every attempt serves **20 items — one per skill area** — from the level's eligible pool
- **Levels:** Foundation (20 min, 80 %), Intermediate (25 min, 80 %, requires Foundation), Advanced (30 min, 85 %, requires Intermediate, approved items only)
- Advanced is served **only** where the reviewed pool covers at least 16 of 20 skill areas; currently 3 of 15 topics. The other 12 refuse with a published reason instead of quietly serving an easier quiz.
- Feedback is per item, except: skipped items never reveal their answers, and attempts answering under half the items receive aggregate feedback only
- Cooldowns: 24 h after a fail, 30 days after a pass, enforced through a pseudonymous history record
- The item bank publishes its own quality status: 251 approved · 1,225 provisional · 24 withheld, every topic marked under review

---

## 📚 The 15 topics

**AI** — Prompt Engineering Fundamentals · Generative AI Basics · AI for Productivity
**Web Dev** — HTML & CSS Fundamentals · JavaScript Essentials · React Basics · Git & GitHub Workflow
**Data** — Python Fundamentals · SQL & Databases · Data Analysis Basics
**Security** — Cybersecurity Essentials
**Design** — UI/UX Design Principles
**Career** — Cloud Computing Basics · Digital Marketing Fundamentals · No-Code & Automation

---

## 🚀 Getting started

```bash
npm install

# Dev server (localhost:5173). The real api/*.ts handlers are served through the
# Vite dev server (scripts/dev-api.mjs), so the full lifecycle works locally.
# Grading needs two variables in .env.local — see .env.example:
#   FREEVERSE_SIGNING_SECRET  and  FREEVERSE_BANK_KEY
npm run dev

# Build for production (typecheck → bank gate → vite build → client-bundle scan)
npm run build

# Checks
npm run typecheck     # tsc --noEmit for app + node configs
npm run lint          # eslint .
npm test              # vitest: lifecycle, bank integrity, level contract, registry
npm run bank:validate # re-derive every number in ASSESSMENT_QUALITY.md
npm run bank:check    # fail if the sealed bank is malformed or leaks plaintext
npm run integration:check  # re-validate the LearnPath mapping (needs network)
```

## ☁️ Deploy to Vercel

```bash
vercel
```

Then set, in **Settings → Environment Variables** (names and generation commands are in [`.env.example`](./.env.example)):

| Variable | Purpose |
|---|---|
| `FREEVERSE_SIGNING_SECRET` | signs attempt/result tokens, derives credential ids |
| `FREEVERSE_BANK_KEY` | seals/unseals the answer key — re-seal with `FREEVERSE_BANK_KEY=<secret> npm run bank:build` and commit `server/bank/*` |
| `FREEVERSE_ISSUER_KEY` | Ed25519 seed (`npm run issuer:keygen`) |
| `GH_REGISTRY_TOKEN` | fine-grained PAT, **Contents: read & write on the registry repo only** |
| `FREEVERSE_REGISTRY_REPO`, `FREEVERSE_REGISTRY_BRANCH`, `FREEVERSE_ALLOWED_ORIGINS`, `FREEVERSE_VERIFY_BASE_URL`, `FREEVERSE_BANK_KEYS_OLD`, `FREEVERSE_REQUIRE_VERIFIED_BANK` | optional overrides |

Every capability fails closed: without the signing secret or the bank key, assessments return `503 engine_unavailable`; without the issuer key or registry token, issuance is disabled. `GET /api/health` reports exactly which capabilities are live. `vercel.json` must keep `includeFiles: server/bank/**` for the `api/*.ts` functions, otherwise the routes deploy without a bank.

Public verification without this app:

```bash
npm run registry:verify -- RFV-2026-XXXXXXXX
# verifies the signature over the registry record with the published issuer key,
# and reports whether the credential is listed as revoked

npm run integration:check
# re-validates the LearnPath mapping (shared/learnpath-map.json) against the live
# LearnPath repository: every linked skill must still exist and still belong to the
# roadmap it is linked from. Exit 3 = could not reach GitHub: nothing verified.
```

---

## 🔗 Integration surface (LearnPath and anything else)

LearnPath (`learn-path-theta.vercel.app`, repo `RRRTX-Labs/LearnPath`) is the companion learning app. The contract is deliberately one-way: **FreeVerse owns assessment and credential state; LearnPath owns learning material.**

| Surface | Purpose |
|---|---|
| `GET /api/catalog` | Machine-readable catalog: stable credential definition ids (`rfv.cred.<topic>.<level>`), levels and pass marks, availability with published reasons, honest quality flags, and the per-topic LearnPath mapping. Public, cacheable, CORS-open. |
| `GET /api/verify?id=` | The authoritative check: `valid · revoked · not-found · invalid-id · registry-unavailable · unauthenticated-record`. Public, CORS-open. A consumer must never cache `valid` for long; revocations are read on every request. |
| `certs/YYYY/MM/<id>.json` | The record itself, in the public registry repository, with its Ed25519 signature. |
| `shared/learnpath-map.json` | The mapping data, pinned to a LearnPath commit ref, with deep links only where both taxonomies name the same skill. |
| `npm run integration:check` | Proves the map still matches the live LearnPath repository. |

What the mapping is **not**: it is not an equivalence claim, not a transfer of credit, and not a claim that LearnPath endorses FreeVerse. Four topics (AI for Productivity, Digital Marketing, No-Code & Automation, UI/UX Design) are explicitly unmapped, and the app links nowhere for them rather than linking to a page that does not exist.

---

## 📂 Project structure

```text
rrrtx-freeverse/
├── api/                      # serverless routes (Vercel Node runtime)
│   ├── attempt.ts grade.ts result.ts credential.ts verify.ts health.ts
│   └── issue-cert.ts         # legacy route — returns 410
├── server/core/              # config, tokens, bank, grading, issuer, registry, rate limits
├── server/bank/              # sealed item bank + manifest + review queue (no plaintext answers)
├── shared/                   # contracts + level policy shared by client and server
├── scripts/                  # bank build/check, bundle scan, keygen, registry verify,
│                             # LearnPath map check, dev API bridge
├── src/                      # React app (pages, components, lib/api.ts client)
├── tests/                    # vitest: lifecycle · bank integrity · level contract ·
│                             # registry client · integration (catalog + LearnPath map)
├── bank-master/              # gitignored plaintext authoring sources (never commit)
├── SECURITY_AUDIT.md         # findings, fixes, executed evidence, residual risk, owner decisions
└── ASSESSMENT_QUALITY.md     # measured item-bank quality, coverage and the rewrite queue
```

---

## 🛡️ Honest disclaimer

Certificates demonstrate that a passing attempt happened. They are not accredited qualifications, not government-issued credentials, and not proof of identity: the integrity signals a browser can report are self-reported and trivially bypassed by a determined person. Treat them as portfolio evidence, not as a replacement for accredited credentials.

## 📜 License

MIT — fork it, remix it, build your own free academy. See [`LICENSE`](./LICENSE).

Built by [Muhammad Ahmad](https://github.com/ahmadrrrtx).
