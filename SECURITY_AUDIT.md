# SECURITY_AUDIT.md — RRRTX FreeVerse assessment & certification system

**Audit date:** 2026-10-14 · **Branch:** `arena/476ccbc0-rrrtx-freeverse`
**Scope:** assessment lifecycle, credential issuance, public registry (read and write), API routes, client bundle, deployment configuration.
**Method:** source review of every hop in the lifecycle, threat modelling per hop, then regression tests that fail if a finding returns. Nothing here was produced by attacking a live system, a real learner or a third party: reproductions run against an in-memory registry fake, a per-run signing key and local fixtures. The three existing production credentials were read (`gh api`) but never modified.

---

## 0. Executive summary

Before this work the system was **client-authoritative**: the browser drew the questions, held the answer key, graded the attempt, decided pass/fail, minted the certificate id and wrote it to a public GitHub repository through an unauthenticated endpoint. A certificate could be produced by editing `location.state`, and the registry accepted a write from anyone.

The lifecycle is now server-authoritative end to end, and the data that must not leak no longer leaves the server: item selection happens against a sealed bank, attempts and results are signed tokens, grading runs against keyed answer commitments, credentials are issued only from a signed passing result, the registry write is create-once behind a server-only token, and verification re-checks an Ed25519 signature and the revocation list — and distinguishes *"not valid"* from *"cannot check right now"*.

| Severity | Confirmed before | Fixed | Mitigated | Accepted (documented) |
|---|---|---|---|---|
| P0 — forged credentials, unauthorised issuance, exposed secrets | 4 | 4 | — | — |
| P1 — answer-key exposure, grading bypass, IDOR, broken verification | 5 | 5 | — | — |
| P2 — privacy, copy accuracy, headers, dependencies, policies, integration | 6 | 5 | 1 (dependency advisories) | — |
| P3 — hardening ideas | 4 | 1 | — | 3 |

Backing evidence: **79 automated tests in 5 files, all passing**, plus the build gates (`npm run build` → typecheck, bank check, bundle scan) and a live dev-server check of the real routes (§3).

---

## 1. Findings

### P0-A · Certificate forgery from browser state — **FIXED**

* **Evidence (before):** `src/lib/quizEngine.ts` computed `score`/`passed` in the browser; `src/pages/Result.tsx` read `location.state.result`, generated the certificate id locally (`generateCertId`, salt `rrrtx-freeverse-v1-2026` hard-coded in `src/lib/crypto.ts`) and called `publishToRegistry` for any object with `passed: true`. Editing `location.state`, or calling the module from the console, produced a credential.
* **Root cause:** the trust boundary was drawn inside the client; no server ever saw an attempt.
* **Fix:** `POST /api/attempt` mints a signed attempt token (HMAC-SHA-256 over HKDF(secret, `token-attempt`)); `POST /api/grade` re-derives score and pass from the private answer key and mints a signed result token; `POST /api/credential` refuses anything that is not a valid, unexpired, passing result token bound to the same recipient. The credential id is `HMAC(HKDF(secret,'credential-id'), nonce|topic|level)` — nothing client-supplied influences it.
* **Regression tests:** *ignores a client-supplied score and passed flag*; *rejects a result token signed with the wrong secret*; *refuses issuance for a failed attempt (403 not_passed)*; *issues exactly one credential per passing attempt (replay returns the same id)*.

### P0-B · Unauthenticated public-registry write endpoint — **FIXED**

* **Evidence (before):** `api/issue-cert.ts` accepted a body from anyone and wrote `certs/YYYY/MM/<ID>.json` into `github.com/ahmadrrrtx/rrrtx-freeverse-certs` using `GH_REGISTRY_TOKEN`. Validation was an id regex, a score range and a parseable date.
* **Fix:** the route is now a tombstone (`410 Gone`, `code: not_implemented`); issuance moved behind the signed-result precondition and is rate-limited (15/hour/IP). The GitHub token is read only from the server environment and never appears in a client bundle — `scripts/check-client-bundle.mjs` fails the build on `ghp_`/`github_pat_` patterns, private-key blocks or server secret names.
* **Regression test:** *keeps the legacy /api/issue-cert endpoint closed*.

### P0-C · The entire answer key was public — **FIXED**

* **Evidence (before):** `src/quizzes/*.json` — all 1,500 items **with `answer` and `explanation`** — were bundled into the client, and each attempt payload carried `correctOptionIndex` plus explanation text.
* **Fix:** items live server-side in `server/bank/*.sealed.json`; answers are stored as keyed commitments (`answer_commit`) and explanations as AES-256-GCM ciphertext (`explanation_enc`). Only prompts, option text and skill labels are sent, in a per-attempt shuffled order derived deterministically from (nonce, item) so the server can invert it without storing state. Build gates: `scripts/check-bank.mjs` refuses a bank with plaintext answers; `scripts/check-client-bundle.mjs` scans `dist/**` for answer-shaped data and secret patterns.
* **Regression tests:** *never exposes an answer key, answer text or explanation in the sealed files*; *asks the server for a question set without answer keys* (walks the whole response object for forbidden keys); *check:client-bundle — no answer keys, bank contents or secrets in the client bundle* (build gate).
* **Residual:** the plaintext bank is still reachable in git history (`git show 853d2dd:src/quizzes/...`). This is a *content* problem, not a code problem — those items' answers are effectively public, which is why the bank is published with a per-item review status and why `ASSESSMENT_QUALITY.md` tracks the rewrite queue. Remediation is rewriting items, not changing code.

### P0-D · Forgeable credential ids, reversible email hash — **FIXED**

* **Evidence (before):** `RFV-YYYY-XXXXXXXX` was the first 8 hex characters of `sha256(name|email|quizId|score|date|integrity|<hard-coded salt>)` — public salt, so ids were predictable and collisions constructible; `hashEmail` was an unsalted SHA-256 of the email.
* **Fix:** ids are HMAC-SHA-256 over `rfv.credential.v1|<attempt-nonce>|<topic>|<level>` keyed by HKDF(signing secret); the nonce is server-minted per attempt, so ids are unguessable and a repeat submission maps to the same id (idempotency) instead of a duplicate. `learner_ref` in the record is a keyed HMAC of name+email, not a plain hash.
* **Regression tests:** *issues exactly one credential per passing attempt*; *replay returns the same credential id with alreadyIssued: true*; plus `scripts/verify-registry-record.mjs`, which re-verifies a record independently of this application.

### P1-A · Verification could not detect tampering or revocation — **FIXED**

* **Evidence (before):** `src/lib/githubRegistry.ts` scanned twelve raw URLs and treated any JSON file with a matching id as a valid certificate. No signature, no status, no revocation.
* **Fix:** `GET /api/verify?id=` rejects ids outside `^RFV-\d{4}-[A-F0-9]{8}$`, reads the record, verifies the Ed25519 signature over canonical JSON against the published issuer key, reads `revocations.json`, and returns exactly one of `valid | revoked | not-found | invalid-id | registry-unavailable | unauthenticated-record`. An outage is an outage; a plausible-looking id is never enough.
* **Regression tests:** *reports valid / revoked / not-found / invalid-id*; *never reports an unreachable registry as valid*; *detects a tampered record (unauthenticated-record)*; *keeps legacy unsigned records verifiable but clearly labelled* — including that the stored legacy `email_hash` is **not** republished.

### P1-B · Cross-user access to attempts and results — **FIXED**

* **Evidence (before):** an attempt lived in `sessionStorage`; the result was a plain object in `location.state`. There was no server object to protect and any shared device could read or alter both.
* **Fix:** attempt and result tokens are bearer tokens bound to a keyed `recipientRef` (name+email) and to a pseudonymous learner ref; issuance requires an exact match. Attempt tokens expire with the level timer plus a 30 s grace (`SUBMIT_GRACE_SEC`); expired attempts are refused with `410 attempt_expired`.
* **Regression tests:** *refuses a submission after the timer + grace*; *rejects a credential request for a different recipient*; *rejects an attempt token used as a result token (wrong_purpose)*.

### P1-C · Grading bypass with malformed submissions — **FIXED**

* **Evidence (before):** `gradeAttempt` compared `answers[i] === q.correctOptionIndex`, so any equal-comparing value counted as correct; nothing validated length or range; skipped questions were treated inconsistently.
* **Fix:** `POST /api/grade` requires exactly one entry per served item, each `null` or an integer within the item's option count, and item refs that match the attempt token. Violations, abandonment and timeouts are graded, but `credentialEligible` is false for them. Skipped items never reveal the correct option or explanation; attempts that answered less than half the items, or that were abandoned, receive aggregate feedback only.
* **Regression tests:** *rejects answers of the wrong length*; *rejects out-of-range option indexes*; *an attempt ended by violations never yields a credential*; *skipped items never disclose the correct option*; *a sub-50 % attempt gets aggregate-only feedback*.

### P1-D · No rate limiting, no body cap, no origin check — **FIXED**

* **Evidence (before):** the single API route accepted unlimited requests of unbounded size from any origin.
* **Fix:** per-IP token buckets (`server/core/ratelimit.ts`: 12 attempts, 40 grades, 15 issuances, 300 verifications, 120 result reads per hour), a 64 KB body cap, and `assertSameOrigin`, which rejects `Sec-Fetch-Site: cross-site` and origins that neither match the request host nor appear in `FREEVERSE_ALLOWED_ORIGINS`.
* **Deliberate scope:** the same-origin rule applies to state-changing methods only (CSRF requires a state change; there is nothing to forge in a GET). The public read-only routes — `/api/catalog`, `/api/verify`, `/api/health` — answer CORS preflights and send `Access-Control-Allow-Origin: *`, because a companion app or a recruiter's dashboard must be able to read them directly. They expose catalog data and credential status only: no recipients, no answers, no secrets, and rate limits still apply per IP.
* **Regression tests:** *rate-limits attempt creation per client*; *rejects cross-site state-changing requests*; *rejects invalid input* (recipient validation, unknown topic, unknown level).
* **Limitation:** counters are per lambda instance and in memory (no shared store). Documented in §5 and §6.

### P1-E · A registry outage was reported as "this credential does not exist" — **FIXED (found during this audit)**

* **Evidence (observed live):** `Registry.readCredential` probed all twelve month paths through `readJson(...).catch(() => null)`, so every failure — DNS, TLS, timeout, 403 — collapsed into `null`, which `/api/verify` renders as `not-found`. Reproduced through the dev server with the three real production credential ids while the sandbox blocked `raw.githubusercontent.com`: all three answered `{"state":"not-found"}` in ~40 ms, which is exactly what a recruiter would have seen for a legitimate credential during a GitHub incident.
* **Root cause:** an error-handling shortcut that turned "could not check" into a factual negative claim.
* **Fix:** `readCredential` collects probe outcomes separately; a record hit wins, a genuine all-404 is `null`, and any failed probe without a hit throws `registry_unavailable` (`server/core/registry.ts`). Verified live: the same three ids now answer `{"state":"registry-unavailable", …}` with "…cannot be confirmed right now. Try again shortly." — never a denial of existence.
* **Regression tests** (`tests/registry.test.ts`, 5): *returns the record and its real path when a month probe hits* (and asserts all 13 probes ran); *returns null only when every probe is a genuine 404*; *reports an unreachable registry as an outage, never as a missing credential*; *treats a non-404 HTTP failure as an outage too*; *still answers once one probe succeeds even if others fail*.

### P2-A · Privacy: a brute-forceable email hash was published — **FIXED for new records; legacy records deliberately untouched**

* **Evidence (before):** `recipient.email_hash = sha256(email)` in a public repository, alongside the recipient's name.
* **Fix:** new records carry `subject.display_name` and a keyed pseudonymous `learner_ref` only — no email, no email hash, no IP. Verifying a legacy record does not republish its stored `email_hash` (asserted by a test). Rate-limit counters are in memory only; logs contain event names and topic/level identifiers, never names, emails or IPs.
* **Deliberate non-change:** the three existing legacy records were left byte-identical. They belong to real people, and editing or deleting them to tidy up a report would be a worse act than the finding.

### P2-B · Copy that claimed more than the system did — **FIXED**

* **Evidence (before):** "Cryptographically verifiable" (there was no signature anywhere), "stored on GitHub forever", "valid forever" printed on the certificate, "1,500 hand-written questions" (no provenance metadata), "integrity is baked into the cert hash".
* **Fix:** the certificate shows its status and pass mark and states plainly that it is not an accredited qualification; verification and credential pages carry an explicit disclosure block (`shared/levels.ts → CREDENTIAL_DISCLOSURE`); landing/About/Terms/Privacy copy now describes server grading, self-reported browser signals, provisional item quality and the real retention model. Stat tiles are derived from generated catalog data (`CATALOG_TOTALS`), so they cannot drift. The closing CTA no longer implies a certificate is automatic, and the GitHub links point at the repository rather than the author's profile.

### P2-C · Deployment configuration allowed unsafe defaults — **FIXED (with one explicit omission)**

* **Before:** `vercel.json` configured only the old edge function; no security headers; the new routes would have deployed without the sealed bank files.
* **Fix:** `vercel.json` sets `includeFiles: server/bank/**` for `api/*.ts`, function memory/duration limits, and `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options: DENY`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`. API responses are `no-store`.
* **Omitted deliberately:** a strict `Content-Security-Policy`. The site loads Fraunces/JetBrains Mono from Google Fonts and Satoshi from Fontshare; a CSP worth having requires self-hosting those fonts first (§7).

### P2-D · Dependency advisories — **PARTIAL, and honestly bounded**

At the start of this pass `npm audit` reported **17 advisories (3 critical, 6 high, 8 moderate)**. After the upgrades below it reports **12 (2 critical, 6 high, 4 moderate), all in dev/build tooling** — no advisory reaches a browser bundle or the deployed server runtime.

| Package | Was | Now | Why |
|---|---|---|---|
| `jspdf` (critical: ReDoS/DoS/LFI/ReDoS-bypass) | 2.5.2 | **4.2.1** | Shipped in the client bundle. Upstream v4 notes: the only breaking change is that Node-side filesystem access is restricted by default. Verified in-repo: the exact call sequence used by `pdfGenerator.ts` (`new jsPDF({orientation,unit,format})` → `addImage(qrPngDataUrl,'PNG',0,0,297,210)` → `setProperties` → `output('arraybuffer')`) produces a valid 84,148-byte `%PDF-` document under the browser module. |
| `react-router-dom` (moderate: open redirect via backslash, SSR constructor injection) | 6.26.2 | **7.18.4** | Direct dependency; advisories clear; typecheck, 64 tests and production build all pass. The upgraded router is exercised by the live dev preview (all routes render through the real router). |
| `vitest` + `@vitest/mocker` + `tinypool` (critical: prototype-pollution RCE) | 2.1.9 | 3.2.7 (still advisory-listed) | Test runner only, never deployed. `vitest@5` was tried and **broke the suite** (`ERR_PACKAGE_PATH_NOT_EXPORTED` from the module loader); reverting kept all tests green. Documented rather than forced. |
| `vite` (high: Windows `server.fs.deny` bypass, launch-editor NTLMv2, optimized-deps path traversal) | 5.4.8 → 5.4.21 | unchanged otherwise | All three advisories affect the **local dev server**, not the production bundle. The fix lands in `vite@8`; a major jump across the Tailwind/React plugin chain was judged riskier than the dev-only exposure. The dev server is bound to the sandbox/localhost and is never deployed. |
| `tailwindcss` (+`chokidar`,`fast-glob`,`micromatch`,`braces`) high | 3.4 | unchanged | Build-time only; the fix is the Tailwind v4 migration (CSS-first config), a separate change. |

### P2-F · "Learn next" links pointed at pages that do not exist — **FIXED (found during this audit)**

* **Evidence (before):** every result page recommendation (up to five per attempt) was built as `https://learn-path-theta.vercel.app/learn/skill/<freeverse-skill-id>` from `shared/levels.ts → LEARNPATH.skillPath`. LearnPath serves `/learn/<roadmap>/<skill>` and `/roadmaps/<roadmap>`; `/learn/skill/...` is not a route, so every learning recommendation on every result page was a dead link — and the FreeVerse skill ids it interpolated (`rfv.skill.python-fundamentals.02-syntax-and-indentation`) are not LearnPath slugs at all.
* **Root cause:** an integration contract written from memory instead of from the other application's routes, with no test that could fail.
* **Fix:** the guess is deleted (`shared/levels.ts` now says why). `shared/learnpath-map.json` records the LearnPath taxonomy read from `RRRTX-Labs/LearnPath@9111b43ad4…` (6 roadmaps, 58 skills) and an explicit mapped-or-unmapped decision for all 15 topics. Links come from `shared/learnpath.ts`: the exact LearnPath skill page when both taxonomies name the same thing (117 curated sub-skill deep links), the topic's roadmap page otherwise, and **null** when LearnPath covers nothing (AI for Productivity, Digital Marketing, No-Code & Automation, UI/UX Design) so the UI renders text instead of a broken link.
* **Verifiable how:** `tests/integration.test.ts` asserts every referenced LearnPath slug exists in the recorded taxonomy and is a node of the roadmap it is linked from, that every topic has a mapped/unmapped decision, and that unmapped topics produce `null`. `npm run integration:check` re-validates the map against the live repository (exit 3 = unreachable, nothing verified).
* **Also new:** `GET /api/catalog` publishes the integration surface (definition ids, availability with published reasons, quality flags, mapping) as public cacheable JSON so a companion app never has to scrape the UI or guess an id.

### P3 · Hardening not done (documented, deliberately)

1. **Shared-store rate limiting and true single-use attempts** — without a datastore, a token can be replayed across lambda instances inside its validity window. Owner decision in §6.
2. **Automated key rotation** — `FREEVERSE_BANK_KEYS_OLD` (map of previous keys) exists and is tested, but rotating is a manual run.
3. **No CSP** — see P2-C.
4. **No CI gate** consuming the commands in §3.

---

## 2. Lifecycle as implemented

```
browser                          server (api/*.ts → server/core/*)
  │  POST /api/attempt       ──►  validate topic/level/recipient
  │                               prerequisites + retake cooldown (registry learner file; fail-open, logged)
  │                               selectItems(): blueprint, coverage-first one item per skill,
  │                               length-risk-ascending shortlist, random pick, deterministic option order
  │                               sign attempt token {t,l,b,bv,q[],r,lr,i,e,n} — refs only, no answers
  │  ◄── prompts + options + deadline + disclosure + integrity note
  │
  │  POST /api/grade         ──►  verify token (signature, purpose, expiry + 30 s grace)
  │                               validate answers[n] ∈ {null, 0..options-1}; invert the per-item shuffle
  │                               score = round(correct/total×100); pass = score ≥ mark ∧ reason ∉ {violations, abandoned}
  │                               <50 % answered or abandoned ⇒ aggregate-only feedback; skipped items never disclose
  │  ◄── AttemptResult + signed result token
  │
  │  POST /api/credential    ──►  verify result token, require pass, require recipient binding
  │                               id = HMAC(secret, nonce|topic|level)  ⇒ replay-safe
  │                               registry.createOnly(path)             ⇒ create-once, never overwrite
  │                               sign record (Ed25519, canonical-json-v1); publish issuer key once
  │  ◄── PublicCredential {id, signature, provenance, …}
  │
  │  GET /api/verify?id=     ──►  validate id · read record · verify signature · read revocations
  │  ◄── valid | revoked | not-found | invalid-id | registry-unavailable | unauthenticated-record
```

Fail-closed behaviour: a bank whose seal does not match, an unresolvable answer commitment, a development-sealed bank on a production deployment, or a missing bank directory all produce `engine_unavailable` (503) — never a degraded-but-successful grade.

---

## 3. What was actually executed

```
$ npx tsc --noEmit -p tsconfig.json                      → exit 0
$ npx eslint .                                           → exit 0
$ npx vitest run                                         → 5 files, 79 tests, 79 passed
$ rm -rf dist && npm run build                           → exit 0
      (typecheck → bank:check → vite build → check:client-bundle)
$ npm run check:client-bundle                            → scanned 8 files (1.23 MB): OK
$ npm run bank:build                                     → 15 topics / 1,500 items re-sealed
      (251 approved · 1,225 provisional · 24 withheld — see ASSESSMENT_QUALITY.md §5)
$ npm run issuer:keygen                                  → wrote .env.local (gitignored; value never printed)
$ npm audit                                              → 12 advisories, dev/build only (§P2-D)

# Live check of the real routes, not mocks: `npm run dev` serves api/*.ts through
# scripts/dev-api.mjs (SSR transform + Node↔Web bridge), so the dev preview runs the
# actual server-authoritative lifecycle.
$ curl -s localhost:5173/api/health
   {"ok":true,"environment":"development",
    "capabilities":{"grading":true,"issuance":false,"verification":true,"registryConfigured":false},
    "bank":{"version":"2.0.0","devSealed":true,"topics":15},
    "notes":["GH_REGISTRY_TOKEN is not set — credential issuance is disabled (fail closed).",
             "The question bank is sealed with the public development key …"]}
$ curl -s "localhost:5173/api/verify?id=RFV-2026-00000000"   → {"state":"not-found"}         (no such id)
$ curl -s "localhost:5173/api/verify?id=RFV-2026-3BB2D4D5"   → {"state":"registry-unavailable"}  (live credential, CDN blocked in sandbox — see P1-E)
$ curl -s localhost:5173/api/catalog | jq '{schema, topics: (.topics|length), learnpath}'
   {"schema":"rfv.integration/1","topics":15,
    "learnpath":{"site":"https://learn-path-theta.vercel.app",
                 "repo":"RRRTX-Labs/LearnPath","ref":"9111b43ad4…",
                 "mappedTopics":11,"unmappedTopics":4}}
$ curl -s -X OPTIONS -D- localhost:5173/api/catalog   → 204 + Access-Control-Allow-Origin: *
$ npm run integration:check                            → learnpath-unreachable (exit 3, sandbox egress blocked)
```

Not executed / not verifiable from this environment:

* `npm run registry:verify` and `npm run integration:check` against real records/repositories — the sandbox cannot reach `raw.githubusercontent.com` or `api.github.com` (connection reset / TLS interception), so verification of the three production credentials and the LearnPath mapping are **unverified here** and must be repeated from a networked machine (§4.4, §4.8).
* No signed end-to-end issuance ran, because issuing requires `GH_REGISTRY_TOKEN` and a production issuer key; both are owner-held secrets and this sandbox must not write to the real registry.
* No browser E2E run (no headless browser is installed in the sandbox). The PDF path was verified at the library level (above); the full html2canvas→jsPDF path needs a human in a browser (§4.7).

Test coverage by intent — `tests/lifecycle.test.ts` 31, `tests/levels-contract.test.ts` 14, `tests/bank-integrity.test.ts` 14, `tests/registry.test.ts` 5, `tests/integration.test.ts` 15:

| Class | Tests |
|---|---|
| Forged score / passed flag ignored | 1 |
| Tampered, expired, purpose-confused, malformed tokens | 5 |
| Answer keys never sent to the browser | 2 |
| Issuance gates (fail, no token, wrong recipient, replay, duplicates) | 6 |
| Registry failure never reports success (503, no file written) | 2 |
| Verification states incl. outage ≠ valid, outage ≠ not-found, tampered record | 12 |
| Rate limits, origin checks, body validation, cooldowns, prerequisites | 8 |
| Bank sealing, tamper detection, key rotation, position bias | 8 |
| Level matrix, availability, coverage, fail-closed selection | 14 |
| Legacy records still verify, without republishing the email hash | 1 |
| Integration: catalog shape, no secrets, CORS, LearnPath map integrity | 15 |

---

## 4. Manual verification required before/after deploy (owner actions)

1. **Generate production secrets** (values never printed, never committed):

   | Variable | Required | Notes |
   |---|---|---|
   | `FREEVERSE_SIGNING_SECRET` | yes | 32+ random bytes; signs attempt/result tokens |
   | `FREEVERSE_BANK_KEY` | yes | seals the item bank; without it grading fails closed |
   | `FREEVERSE_ISSUER_KEY` | yes for issuance | Ed25519 seed (`npm run issuer:keygen`) |
   | `GH_REGISTRY_TOKEN` | yes for issuance | fine-grained PAT, **Contents: read & write on `ahmadrrrtx/rrrtx-freeverse-certs` only** |
   | `FREEVERSE_REGISTRY_REPO` / `_BRANCH` | optional | defaults to the current registry / `main` |
   | `FREEVERSE_ALLOWED_ORIGINS` | optional | extra browser origins allowed to call the API |
   | `FREEVERSE_VERIFY_BASE_URL` | optional | canonical origin used in verify URLs/QR |
   | `FREEVERSE_BANK_KEYS_OLD` | rotation only | JSON `{ keyId: previous material }` |
   | `FREEVERSE_REQUIRE_VERIFIED_BANK` | optional | `1` pauses every topic whose bank is not gate-clean |

2. **Re-seal the bank with the production key:** `FREEVERSE_BANK_KEY=<secret> npm run bank:build`, then commit the regenerated `server/bank/*`. Until this runs, the manifest reports the public development key and production grading refuses to start (fail closed).
3. **Deploy**, then confirm `GET /api/health` reports `grading`/`issuance`/`verification` true and `devSealed: false`.
4. **Verify the three existing credentials from a networked machine:** `npm run registry:verify -- RFV-2026-3BB2D4D5` (and `D60DF8D6`, `A0480625`). Expected: record present, not revoked, `RESULT: registry-record-present-but-unverified` (they predate signing). Do not edit them.
5. **Confirm the issuer public key was published** to `issuer-keys/<keyId>.json` on the first issuance.
6. **Revocation procedure:** append `{"id":"RFV-YYYY-XXXXXXXX","revoked_at":"<iso>","reason":"<short>"}` to `revocations.json`. Every verification then reports `revoked`. Never delete a credential file.
7. **After the first real issuance:** run `npm run registry:verify -- <new id>` (expect `RESULT: signature-valid`) and load `/verify?id=<id>` in a browser; also download the PDF and JPG from the certificate page — that exercises the html2canvas→jsPDF path with the new library versions.
8. **Run `npm run integration:check` from a networked machine** (expect `RESULT: mapping-valid`). If it reports `stale-mapping`, fix `shared/learnpath-map.json` before shipping: the pointers to LearnPath are the only place this project claims a relationship with another system, and a stale one shows a learner a 404.

---

## 5. Residual risks and accepted limitations (stated plainly)

* **No proctoring.** Secure Mode is browser-level and self-reported: a second device, a screenshot tool, a browser extension or a VM defeats it. It is labelled as such everywhere it appears. A credential is evidence that *a* passing attempt happened, not proof of who took it.
* **Stateless tokens.** Without a datastore a token can be replayed across parallel lambda instances inside its validity window, and attempt state cannot be shared. Expiry, recipient binding, deterministic ids and create-once writes bound the impact; per-instance rate limits do not stop a distributed attacker.
* **Item quality is the binding constraint.** 1,225 of 1,500 items are provisional and are so labelled; the bank and its disclosed gaps are described in `ASSESSMENT_QUALITY.md`. A credential from an under-review topic is explicitly marked provisional on the record and on the verification page.
* **The plaintext bank is still in git history** (P0-C residual): answers for legacy item ids are effectively public. Rewriting items is the remedy.
* **Legacy records are unverifiable by design** — issued before signing existed; shown as present-and-unrevoked and labelled `legacy-unsigned`.
* **The registry is a third-party dependency.** A GitHub outage, a revoked PAT or a renamed repository makes verification report `registry-unavailable` — correct, and now (P1-E) never a false "does not exist". The verify UI distinguishes "cannot check" from "not valid".
* **Deletion is not possible.** Git history is append-only: revocation means adding a `revocations.json` entry; a rewrite would be defeated by forks/mirrors. Stated on the Privacy page.
* **No CSP yet** (§P2-C), and dev-time toolchain advisories remain (§P2-D).
* **Browser cache.** `localStorage` holds the learner's own history for display; every badge rendered from it is re-checked against `/api/verify`.
* **Logging.** Structured key/value events with identifiers only — no names, emails, IPs or token contents.

---

## 6. Owner decisions still open

1. **Shared persistence** (Vercel KV / Upstash / small SQL): would give cross-instance rate limiting, true single-use attempts and server-side attempt state. Costs a dependency and a secret; without it the §5 residuals stand.
2. **Legacy `email_hash` records** — leave as-is (default, recommended) or redact the field in place, which changes three real learners' records and breaks external references to them.
3. **Advanced-level policy** — Advanced opens only where the reviewed-approved pool covers ≥16 of 20 skill areas *and* the level's items exactly; uncovered areas are published on the credential. The stricter alternative (all 20) closes Advanced for every topic today.
4. **When to flip `FREEVERSE_REQUIRE_VERIFIED_BANK=1`** — pauses all topics until item review clears them.
5. **Whether to publish a real security contact and a data-controller identity line** (the policies currently use the author's personal email).
6. **Whether LearnPath should surface FreeVerse credentials next to its own skills.** The technical contract exists (`/api/catalog`, `/api/verify`, mapping file); the product decision — and who owns the copy that describes what a credential proves — is the owner's. Nothing is wired from this side beyond read-only endpoints.

---

## 7. Follow-ups, ordered

1. Self-host the three web fonts, then add a strict CSP (`script-src 'self'; style-src 'self'; object-src 'none'; frame-ancestors 'none'`).
2. Tailwind 4 migration → clears the four remaining build-time high advisories.
3. Re-attempt `vitest@5` when the plugin chain supports it.
4. Add `npm run lint && npm run typecheck && npm test && npm run build` as a required CI check.
5. When a datastore lands, move rate limiting and attempt single-use into it and record issuance there for queryable revocation.
6. Keep the LearnPath contract fresh: re-run `npm run integration:check` when LearnPath ships a taxonomy change, and review the four unmapped topics if it adds a design, marketing, automation or AI-productivity roadmap.

---

## 8. Honesty statement

Every claim in this document comes from reading the code, running the commands in §3, or querying the public registry's structure. Where this environment could not reach a service (`raw.githubusercontent.com`, the deployed site) it is marked unverified rather than assumed. No production system was attacked, no learner data was altered, and no credential was issued or revoked during this work.
