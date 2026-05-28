# 🎓 RRRTX FreeVerse

> **Real skills. Real certificates. Forever free.**

A 100% free certification platform: take a 20-question quiz, score 80%+, get a verifiable PDF certificate with a QR code. Zero database. Zero paywall. Zero paid API. Hosted entirely on Vercel + GitHub.

---

## ⚡ What makes this different

| Platform | Free certificate? | Catch |
|---|---|---|
| Alison | ❌ Costs €20-50 | "Free" is marketing |
| CodeAlpha | ❌ ₹100-500 after passing | Surprise paywall |
| SkillUp | ✅ But upsells $1K bootcamps | Lead-gen funnel |
| freeCodeCamp | ✅ Truly free | Programming-only |
| **RRRTX FreeVerse** | ✅ **Forever free** | **None. That's the point.** |

---

## 🏗️ Architecture (zero-cost, zero-DB)

```
User browser
    │
    ▼
Static React app on Vercel  ─────► quizzes/*.json (in repo)
    │
    ├─► Web Crypto API  ──► generate SHA-256 cert ID (in browser)
    ├─► jsPDF + html2canvas ──► generate certificate PDF
    └─► POST /api/issue-cert (Vercel Edge Function)
                │
                ▼
        commit JSON to github.com/ahmadrrrtx/rrrtx-freeverse-certs
                │
                ▼
        anyone can verify via raw.githubusercontent.com (no auth)
```

**Total monthly cost:** $0 up to ~50,000 users.

---

## 🧠 The Quiz System

- **15 topics**, each with **100 questions** in **20 sub-pools of 5**
- Each attempt pulls **1 question randomly per sub-pool** = 20 unique Qs
- Probability of duplicate attempt: ~1 in 95 trillion
- 20-minute timer, tab-switch detection, copy-paste blocking
- Pass mark: **80%** (16/20)
- Cooldowns: 24h after fail, 30 days after pass

See [`MASTER-PLAN.md`](./MASTER-PLAN.md) for the complete architecture and the 4-week roadmap.

---

## 📚 The 15 Topics (Tier 1 = launch first)

### Tier 1 — AI Era
1. 🧠 Prompt Engineering Fundamentals
2. ✨ Generative AI Basics
3. ⚡ AI for Productivity

### Tier 2 — Web Development
4. 🎨 HTML & CSS Fundamentals
5. 📜 JavaScript Essentials
6. ⚛️ React Basics
7. 🐙 Git & GitHub Workflow

### Tier 3 — Data & Programming
8. 🐍 Python Fundamentals
9. 🗄️ SQL & Databases
10. 📊 Data Analysis Basics

### Tier 4 — Career & Soft Tech
11. 📣 Digital Marketing Fundamentals
12. 🛡️ Cybersecurity Essentials
13. 🖌️ UI/UX Design Principles
14. 🔧 No-Code & Automation
15. 💼 Freelancing & Remote Work

---

## 🚀 Getting started (development)

```bash
# install
npm install

# dev server (localhost:5173)
npm run dev

# build for production
npm run build

# preview production build
npm run preview
```

## ☁️ Deploy to Vercel

```bash
# one-time
npm i -g vercel
vercel login

# deploy
vercel
```

Then in the Vercel dashboard:
1. **Settings → Environment Variables → add:**
   `GH_REGISTRY_TOKEN` = your GitHub Personal Access Token with `contents:write` scope on `rrrtx-freeverse-certs`
2. Done. Edge Function `/api/issue-cert` will use it to commit certs.

---

## 📂 Project structure

See [`MASTER-PLAN.md`](./MASTER-PLAN.md) section 6 for the full tree.

Key folders:
- `src/lib/` — crypto, quiz engine, storage, PDF generator, GitHub registry, anti-cheat
- `src/quizzes/` — quiz JSON files (one per topic)
- `src/data/quizMeta.ts` — lightweight catalog for the home page
- `api/issue-cert.ts` — Vercel Edge Function for GitHub commits

---

## 🛡️ Honest disclaimer

RRRTX FreeVerse certificates demonstrate skill acquisition and are not equivalent to academic credentials or government-issued certifications. Use them as portfolio skill badges, not as a replacement for accredited credentials.

---

## 📜 License

MIT. Fork it. Remix it. Build your own free academy.

---

Built with ❤️ by [Muhammad Ahmad](https://github.com/ahmadrrrtx) from Chiniot, Pakistan.
