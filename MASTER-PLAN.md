# 🎓 RRRTX FreeVerse — Complete Master Plan
**Owner:** Muhammad Ahmad (ahmadrrrtx)
**Stack:** React + Vite + TypeScript + Tailwind | Vercel hosting | GitHub registry | Zero DB | Zero paid API
**Status:** Build-ready blueprint

---

## 0. Brand & Naming

### Final Name Decision Matrix

| Name | Vibe | Domain availability check |
|---|---|---|
| **RRRTX FreeVerse** ⭐ | Your brand + your concept | Use `freeverse.rrrtx.com` or `rrrtxfreeverse.vercel.app` |
| **RRRTX Academy** | Classic, serious | Easy to defend later |
| **FreeVerse Certified** | The credential lens | Could be the cert sub-brand |
| **OpenBadge** | Generic, hard to own |

### Recommended naming system:
- **Platform name:** RRRTX FreeVerse
- **Tagline:** *"Real skills. Real certificates. Forever free."*
- **Sub-brand for cert:** *FreeVerse Certified™*
- **Cert ID prefix:** `RFV-` (RRRTX FreeVerse) → e.g., `RFV-2026-A3F9C2B8`
- **URLs:**
  - Main: `rrrtx-freeverse.vercel.app` (free) or buy `rrrtxfreeverse.com` ($10/yr)
  - Verify: `/verify`
  - Public profile: `/u/[username]`
  - Cert registry repo: `github.com/ahmadrrrtx/rrrtx-freeverse-certs`

---

## 1. Vercel + Crypto = Yes, perfectly compatible ✅

**Short answer to your question: YES, you can host the entire crypto-based cert engine on Vercel.**

Here's why and how:

| Concern | Reality |
|---|---|
| "Does Vercel support SHA256 hashing?" | The browser does it natively via **Web Crypto API** (`crypto.subtle.digest`). Vercel just serves your static files — the hash happens in the user's browser. No server needed. [Source](https://www.reddit.com/r/reactjs/comments/1fr921k/cryptojs_replacement/) |
| "Do I need backend functions?" | **No.** Pure static React app works. You CAN optionally use Vercel Edge Functions (free tier: 500K invocations/mo) if you want a secret salt to live server-side instead of being baked into the JS bundle. |
| "Will it scale?" | Vercel free tier = 100GB bandwidth/mo + unlimited static requests. Easily handles 50K+ users. |
| "Can I write to GitHub from Vercel?" | Yes — via a Vercel Edge Function that holds the GitHub token as an env var, called from your frontend. Or use Make.com webhook as the proxy. Either works. |

**Architecture verdict:** Pure Vite + React + TS static export → deploy to Vercel → done. Crypto happens in the browser. GitHub commits happen via either (a) Vercel Edge Function holding the token, or (b) Make.com webhook. Both are free.

---

## 2. The 15 Quiz Topics (Carefully Chosen for 2026)

These are picked based on Pakistan/India job market data 2026, beginner-accessibility, and how easy it is to write 100 solid pre-defined MCQs without needing live code execution.

### Tier 1 — AI Era (high demand, you have authority here)
1. **Prompt Engineering Fundamentals** — Your strength; massive 2026 demand
2. **Generative AI Basics** — ChatGPT, Gemini, Claude usage + concepts
3. **AI for Productivity** — Workflows, automation, no-code AI tools

### Tier 2 — Web Development (classic, evergreen)
4. **HTML & CSS Fundamentals** — Universal starting point
5. **JavaScript Essentials** — The #1 most-taken cert topic globally
6. **React Basics** — Hot skill, you use it daily
7. **Git & GitHub Workflow** — Every dev needs this

### Tier 3 — Data & Programming
8. **Python Fundamentals** — Top-3 most-searched cert
9. **SQL & Databases** — Always in demand, easy to MCQ
10. **Data Analysis Basics** — Pandas, Excel, charts

### Tier 4 — Career & Soft Tech
11. **Digital Marketing Fundamentals** — Huge in PK, easy MCQ
12. **Cybersecurity Essentials** — Booming, high MCQ-ability
13. **UI/UX Design Principles** — Figma + design theory
14. **No-Code & Automation** — Make.com, Zapier, Lovable (your strength)
15. **Freelancing & Remote Work** — Career-focused, PK-relevant

### Why these 15 specifically?
- ✅ **All MCQ-able** — no code execution required (unlike full programming tests)
- ✅ **High search volume** — people actively want certs in these
- ✅ **You can write authentic questions** — these match your portfolio/expertise
- ✅ **Beginner-to-intermediate** — your target audience
- ✅ **Pakistan-relevant** — every one of these is a real freelance/job skill in PK 2026 [Source](https://www.qureos.com/career-guide/in-demand-tech-jobs-in-pakistan)
- ✅ **No quickly-outdated content** — these don't change every 6 months

---

## 3. The Quiz Architecture (the hero design)

### 3.1 The "Different Questions Every Time" Solution

This is the academically-proven approach used by Canvas, Blackboard, and Brightspace [Source](https://link.springer.com/article/10.1007/s40979-022-00103-2):

**The Sub-Pool Method (recommended for you):**
- Each topic has **100 questions total**
- Split into **20 sub-pools of 5 questions each** (covering 20 distinct sub-topics)
- Each attempt pulls **1 question randomly from each sub-pool** = 20 questions total
- **Guarantees:** full topic coverage every attempt + virtually zero question overlap between attempts

**Mathematical proof of variation:**
- 5 questions per sub-pool × 20 sub-pools
- Probability two attempts get the SAME 20 questions = (1/5)^20 = **1 in 95 trillion**
- Even with answer-position shuffling, every attempt is functionally unique

### 3.2 The Quiz JSON Schema

```json
{
  "id": "prompt-engineering",
  "title": "Prompt Engineering Fundamentals",
  "description": "Master the art of communicating with AI",
  "category": "AI",
  "icon": "🧠",
  "difficulty": "Beginner",
  "estimatedMinutes": 20,
  "passingScore": 80,
  "questionsPerAttempt": 20,
  "durationSec": 1200,
  "subPools": [
    {
      "topic": "What is a prompt",
      "questions": [
        {
          "id": "pe-001",
          "q": "What is a 'prompt' in the context of AI?",
          "options": [
            "The input text given to an AI model to generate a response",
            "The error message shown when an AI fails",
            "A type of AI model architecture",
            "The output produced by an AI model"
          ],
          "answer": 0,
          "explanation": "A prompt is the instruction or input you provide to an AI model. The quality of your prompt directly affects the quality of the response."
        },
        // ... 4 more questions in this sub-pool covering the same micro-topic
      ]
    },
    // ... 19 more sub-pools
  ]
}
```

### 3.3 Quiz Engine Behavior

```
Attempt Start
    │
    ▼
[Pick 1 question randomly from each of the 20 sub-pools] ──► 20 unique Qs
    │
    ▼
[Shuffle question order (Fisher-Yates)]
    │
    ▼
[For each question: shuffle options + remap correct index]
    │
    ▼
[Start 20-minute timer]
    │
    ▼
[Anti-cheat: tab-switch detect, no copy/paste, no right-click]
    │
    ▼
[Auto-submit on timer end OR user submit OR 3 tab-switches]
    │
    ▼
[Grade: score = (correct / 20) × 100]
    │
    ▼
    ├─ Score >= 80 ──► Certificate Generation Flow
    └─ Score <  80 ──► Failure screen + 24h cooldown (localStorage) + retry button
```

### 3.4 Timer & UX Specs

| Element | Spec |
|---|---|
| **Total duration** | 20 minutes (1,200 seconds) = 60 sec/question buffer |
| **Per-question time** | No individual limit (user manages pacing) |
| **Timer display** | Top-right, color shifts: green → yellow at 5min left → red at 1min left |
| **Auto-save** | Every answer change → sessionStorage (survives accidental reload) |
| **Resume** | If user reloads, restore answers + remaining time |
| **Pause** | NOT allowed (real exam feel) |
| **Skip & return** | Allowed (question grid shows answered/unanswered) |
| **Submit early** | Allowed if all answered, with confirmation modal |
| **Force submit triggers** | Timer = 0 / 3 tab switches / Browser back button |

### 3.5 Anti-Cheat Layer (no DB needed)

```js
// All of these run in the browser, no server needed
const antiCheat = {
  randomizeQuestions: true,      // Fisher-Yates shuffle
  randomizeOptions: true,         // per question
  disableRightClick: true,        // oncontextmenu = false
  disableCopyPaste: true,         // oncopy/oncut/onpaste = false
  disableDevTools: 'detect',      // detect F12 open via window size delta
  tabSwitchDetection: 3,          // 3 strikes → auto-submit
  fullscreenMode: 'request',      // ask but don't force
  cooldownAfterFail: 86400,       // 24h before retry (localStorage timestamp)
  cooldownAfterPass: 2592000,     // 30 days before retake (avoid spam certs)
};
```

**Honest disclaimer for your docs:** Determined cheaters can bypass any client-side check. That's accepted — even Alison and Coursera have the same limitation without paid proctoring. Your defense is *honor system + good question pools*, not impossible-to-cheat tech.

---

## 4. The Certificate System (the crown jewel)

### 4.1 Cert ID Format
```
RFV-2026-A3F9C2B8
│   │      │
│   │      └─ first 8 hex chars of SHA-256 hash
│   └─ year of issue (helps with salt rotation later)
└─ RRRTX FreeVerse prefix
```

### 4.2 The Hash Recipe
```js
async function generateCertId(name, email, quizId, score, dateISO) {
  const SALT = "rrrtx-freeverse-v1-2026"; // can rotate yearly
  const input = `${name.toLowerCase().trim()}|${email.toLowerCase().trim()}|${quizId}|${score}|${dateISO.slice(0,10)}|${SALT}`;
  const buffer = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return `RFV-${dateISO.slice(0,4)}-${hashHex.slice(0, 8).toUpperCase()}`;
}
```

**Why this works:**
- Deterministic: same inputs always produce same ID → user can re-verify their own cert
- Tamper-evident: change any input → completely different ID → instantly detectable
- Privacy-respecting: original PII can be hashed-and-stored (not plaintext) in registry

### 4.3 Storage: Hybrid Model (GitHub + Crypto)

**On pass, in parallel:**
1. **Crypto check (instant):** Generate cert ID, embed in PDF, user downloads.
2. **GitHub registry (async):** Fire-and-forget POST to a Vercel Edge Function which commits a JSON file to `github.com/ahmadrrrtx/rrrtx-freeverse-certs`.

**Registry file format** (`/certs/2026/05/RFV-2026-A3F9C2B8.json`):
```json
{
  "id": "RFV-2026-A3F9C2B8",
  "issued_at": "2026-05-28T14:30:00.000Z",
  "recipient": {
    "name": "Hamza Ali",
    "email_hash": "sha256:7d8a3b2e..."
  },
  "quiz": {
    "id": "prompt-engineering",
    "title": "Prompt Engineering Fundamentals",
    "version": "1.0"
  },
  "score": 92,
  "percentage": 92,
  "issuer": "RRRTX FreeVerse",
  "verify_url": "https://rrrtx-freeverse.vercel.app/verify?id=RFV-2026-A3F9C2B8"
}
```

### 4.4 Verification Flow

When someone visits `/verify?id=RFV-2026-A3F9C2B8`:

```
┌─────────────────────────────────────────┐
│  1. Try GitHub registry (Model B)       │
│     fetch raw.githubusercontent.com/...  │
│     ↓                                    │
│     If 200 → show ✅ verified card      │
│     If 404 → fall through               │
├─────────────────────────────────────────┤
│  2. Fall back to crypto check (Model A) │
│     Ask user to enter Name + Email      │
│     Re-compute hash → compare           │
│     ↓                                    │
│     If match → show ✅ verified card    │
│     If no match → show ❌ invalid       │
└─────────────────────────────────────────┘
```

---

## 5. Tech Stack (final, locked-in)

| Layer | Choice | Why |
|---|---|---|
| **Framework** | Vite + React 18 + TypeScript | Fast, modern, your stack |
| **Styling** | Tailwind CSS v3 + shadcn/ui | Beautiful defaults, you already use these |
| **Routing** | React Router v6 | Standard, simple |
| **State** | Zustand | Tiny, no boilerplate |
| **PDF gen** | jsPDF + html2canvas | MIT licensed, all client-side |
| **QR codes** | qrcode (npm) | Pure JS, no server |
| **Hashing** | Web Crypto API (built-in) | Zero dependencies |
| **Animation** | framer-motion + canvas-confetti | Polish |
| **Icons** | lucide-react | Free, beautiful |
| **Hosting** | Vercel | Free, fast, git-deploy |
| **Cert registry** | GitHub repo via Vercel Edge Function | Free, public, tamper-evident |
| **Analytics** | Vercel Analytics free tier OR Plausible | Privacy-first |

---

## 6. Project Structure

```
rrrtx-freeverse/
├── public/
│   ├── favicon.svg
│   ├── og-image.png            ← social share preview
│   └── cert-bg.svg              ← certificate background art
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── QuizCard.tsx
│   │   ├── QuizPlayer.tsx
│   │   ├── QuestionView.tsx
│   │   ├── Timer.tsx
│   │   ├── ResultScreen.tsx
│   │   ├── CertificateTemplate.tsx
│   │   ├── CertificateDownloader.tsx
│   │   ├── VerifyForm.tsx
│   │   ├── Header.tsx
│   │   └── Footer.tsx
│   ├── pages/
│   │   ├── Home.tsx              ← list all 15 quizzes
│   │   ├── Quiz.tsx              ← /quiz/:id
│   │   ├── Result.tsx            ← /result/:id
│   │   ├── Certificate.tsx       ← /certificate/:certId
│   │   ├── Verify.tsx            ← /verify
│   │   ├── Profile.tsx           ← /u/:slug
│   │   └── About.tsx
│   ├── lib/
│   │   ├── crypto.ts             ← SHA-256 hashing, cert ID gen
│   │   ├── quizEngine.ts         ← randomization, scoring, sub-pool logic
│   │   ├── storage.ts            ← localStorage wrapper
│   │   ├── pdfGenerator.ts       ← jsPDF cert export
│   │   ├── githubRegistry.ts     ← writes to registry via Edge Function
│   │   └── antiCheat.ts          ← tab switch, copy block, etc
│   ├── quizzes/
│   │   ├── index.ts              ← exports list of all quizzes
│   │   ├── prompt-engineering.json
│   │   ├── generative-ai-basics.json
│   │   ├── ai-productivity.json
│   │   ├── html-css.json
│   │   ├── javascript-essentials.json
│   │   ├── react-basics.json
│   │   ├── git-github.json
│   │   ├── python-fundamentals.json
│   │   ├── sql-databases.json
│   │   ├── data-analysis.json
│   │   ├── digital-marketing.json
│   │   ├── cybersecurity.json
│   │   ├── uiux-design.json
│   │   ├── no-code-automation.json
│   │   └── freelancing.json
│   ├── data/
│   │   └── quizMeta.ts          ← lightweight catalog for homepage
│   ├── styles/
│   │   └── globals.css
│   └── types.ts
├── api/                          ← Vercel Edge Functions
│   └── issue-cert.ts             ← writes to GitHub registry
├── .env.example
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── vercel.json
```

---

## 7. The 4-Week Build Roadmap

### 🚀 Week 1 — Foundation + Quiz Engine
- [ ] Day 1: Repo setup, Vite + React + TS + Tailwind, deploy "hello world" to Vercel
- [ ] Day 2: Build home page UI with all 15 quiz cards
- [ ] Day 3-4: Quiz player UI (intro screen, question view, timer)
- [ ] Day 5: Anti-cheat layer (tab switch, copy block, fullscreen)
- [ ] Day 6: Write **Prompt Engineering quiz JSON** (100 questions, 20 sub-pools)
- [ ] Day 7: Polish, mobile testing

### 🎓 Week 2 — Certificate System
- [ ] Day 8-9: Cert ID generator + crypto.ts module
- [ ] Day 10-11: Beautiful certificate HTML template (RRRTX.OS aesthetic)
- [ ] Day 12: jsPDF integration + download flow
- [ ] Day 13: Verify page (Model A — crypto only)
- [ ] Day 14: LinkedIn "Add to Profile" deep link + social share

### 🌐 Week 3 — GitHub Registry + More Quizzes
- [ ] Day 15: Create cert registry repo + Vercel Edge Function
- [ ] Day 16: Wire up async GitHub commit on cert issue
- [ ] Day 17: Update verify page (Model B with Model A fallback)
- [ ] Day 18-21: Write quizzes 2-6 (JS, Python, HTML/CSS, Git, Generative AI)

### 🎯 Week 4 — Polish, Remaining Quizzes, Launch
- [ ] Day 22-25: Write quizzes 7-15
- [ ] Day 26: Profile pages, OG share images
- [ ] Day 27: Analytics, error tracking, performance pass
- [ ] Day 28: Launch on Product Hunt + DEV.to + LinkedIn + Reddit (r/learnprogramming, r/Pakistan, r/developersIndia)

---

## 8. Marketing Hook Suggestions

> **"The free certification platform that doesn't have a catch."**
> "Take a 20-question quiz. Score 80%+. Get a verifiable certificate. That's it. No paywall, no email spam, no upsells. Forever free."

### Differentiator copy:
- "Unlike Alison, the certificate is actually free."
- "Unlike CodeAlpha, no surprise payment after you pass."
- "Unlike SkillUp, no upsell to a ₹50,000 bootcamp."
- "Just: learn, prove, share. Powered by RRRTX."

### Launch plan:
1. **DEV.to article:** "I Built a Free Certification Platform — Here's the Architecture (No DB, No Backend, $0 Forever)"
2. **LinkedIn post:** Personal story + screenshot of cert + GitHub link
3. **Product Hunt:** Launch on a Tuesday/Wednesday
4. **Reddit:** r/learnprogramming, r/SideProject, r/Pakistan, r/developersIndia (frame it as helpful, not promotional)
5. **Twitter/X:** Build-in-public thread with screenshots of the architecture
6. **Discord:** Share in dev communities you're already in

---

## 9. Phase 2 Features (after launch, NOT v1)

- AI question generator (Groq writes new questions from a topic prompt → you review → commit)
- Bilingual support (Urdu translations for quiz UI)
- Difficulty levels (Beginner / Intermediate / Advanced) for each topic
- Quiz combos / Learning Paths ("Full Stack" = 5 specific certs)
- Public leaderboard (top scorers per quiz this month — via GitHub registry queries)
- API for embedding cert quizzes on other sites
- Browser extension: "Show RRRTX certs on any LinkedIn profile"

---

## 10. Honest Risk Register

| Risk | Severity | Mitigation |
|---|---|---|
| Recruiters don't value the cert | Medium | Position as "skill badge for portfolio", not "credential" |
| Cheaters share answer keys | Low | Sub-pool randomization (95 trillion combinations) |
| GitHub API rate limit | Low | 5,000 req/hr authenticated = ~83 certs/min. If hit: queue or Make.com fallback |
| SECRET_SALT leaks from JS bundle | Low | Move to Vercel Edge Function env var; or accept it (fCC's verify URLs are equally "exposed") |
| Question pool gets exhausted (someone takes 100 quizzes) | Negligible | They'd still see fresh combinations every time |
| Vercel free tier blown | Negligible | 100GB/mo = ~3M page views. If you get there, you have other problems (good ones) |
| Cert pdf looks cheap | High if real | Spend extra time on design — this IS the product |

---

## ✅ Final Verdict

**This is 100% buildable in 4 weeks, runs forever on $0, and matches your existing skill stack perfectly.**

You're not learning anything new. You're remixing:
- Brain Rot IQ (scored quiz)
- Genius Math Buddy (EdTech UI)
- Make.com Proposal Agent (webhook automation)
- HireReady (career credentials)
- RRRTX.OS aesthetic (the cert design)

→ into ONE flagship product that has a real shot at being the "free FreeVerse" of the Pakistani learning market.

**Now go build it. I've written you starter code in this folder. See `README.md` next.**
