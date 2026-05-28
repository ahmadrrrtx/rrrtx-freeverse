# 🎨 RRRTX FreeVerse — Complete Design System Plan
**Status:** Design phase. Nothing is built yet. This is the blueprint everything follows.
**Author note:** Designed to map 1:1 onto the existing backend (15 quizzes, Secure Mode, crypto cert system, GitHub registry, Vercel deployment).

---

## 0. The Strategic Position (the "why" before the "what")

Before color palettes and fonts: **what does RRRTX FreeVerse FEEL like?**

This is a free certification platform competing against Coursera, Udacity, Alison, freeCodeCamp. To stand out without a marketing budget, the **product itself must be the marketing**. The design has to make people screenshot it and share it.

### The brand promise (the three words)
> **Earned. Verifiable. Free.**

### The visual emotion (one sentence)
> *"It looks like a premium product that someone obviously decided to give away — not a cheap free product trying to look premium."*

That distinction is everything. Cheap-trying-to-look-premium = lots of gradients, neon, glassmorphism, 3D blobs. Premium-but-free = restraint, typography hierarchy, deliberate motion, generous whitespace.

### Visual references I studied
| Reference | What I'm taking | What I'm leaving |
|---|---|---|
| **Linear.app** | Restraint, motion sensibility, dark mode mastery, gradient meshes used SPARINGLY | Their density (we want more breathing room for learners) |
| **Vercel** | Typography hierarchy, minimal palette, geometric precision | Their corporate coldness (we want warmth too) |
| **Stripe** | Documentation craft, density done right, animated demos | Their B2B formality (we want some playfulness) |
| **Apple HIG** | Spatial design, depth without skeuomorphism, certificate restraint | Their walled-garden assumptions |
| **freeCodeCamp** | Trust signals, openness, community feel | Their dated visual language |
| **Anthropic Claude UI** | Calm warmth, serif/sans contrast, paper-like backgrounds | Their narrow chat focus |
| **GitHub Skyline** | Generative beauty per user, shareability | Their one-time novelty |

### Visual references I REJECTED
- ❌ **Heavy 3D landing pages** (Spline, Three.js heroes). Looks cool first visit, **kills mobile performance**, distracts from the core task (taking a quiz), and feels like "free tool trying to seem expensive." We will use 3D **once**, surgically, on the certificate generation moment.
- ❌ **Neumorphism / Claymorphism** as primary style. Accessibility issues, dated since 2021.
- ❌ **Aurora gradients / nebula** as primary background. Used by every AI startup. Generic.
- ❌ **Brutalism**. Looks indie but punishes new users.

---

## 1. The Core Identity

### Brand name (locked in)
**RRRTX FreeVerse** — using the existing RRRTX brand equity

### Visual signature
- Wordmark: `rrrtx freeverse` (all lowercase, monospace logo with the dot — see Logo section)
- Cert prefix: `RFV-` (already in the crypto system: `RFV-2026-A3F9C2B8`)
- Tagline: **"Earn it. Verify it. Own it. Free."**

### Brand personality (5 words, in priority order)
1. **Earnest** — we mean it about "forever free"
2. **Sharp** — like a great editor, not a cluttered marketplace
3. **Calm** — learning should feel like a library, not a notification feed
4. **Confident** — we made this; we stand behind every question
5. **Warm** — humans use this, not just developers

### What we sound like (voice)
| Trait | Example |
|---|---|
| Direct | *"Score 80%. Get the cert. That's it."* |
| Honest | *"This is a skill badge, not an accredited degree."* |
| Warm | *"Welcome back, Hamza. Ready for round two?"* |
| Specific | *"20 questions. 20 minutes. 80% to pass."* (Not: "Quick assessment to validate your knowledge.") |
| Never | corporate-speak, fake urgency, "unlock", "unleash", "transform" |

---

## 2. The Logo System

**Decision: Pure typography logo, no icon.** Icons date; great wordmarks compound.

### Primary wordmark
```
rrrtx freeverse
```
- Font: **JetBrains Mono** at 600 weight (or **Geist Mono** as alternate)
- Letter-spacing: tight (-0.02em)
- The "x" in `rrrtx` and the "v" in `freeverse` can be subtly highlighted (1-2 hue shift) in marketing contexts only
- All lowercase — never uppercase
- The space between the two words is meaningful (the "namespace separator")

### Mark / favicon
A single character: **`◐`** (half-circle / yin-yang style — symbolizes "half-public, half-cryptographically-yours")
- 32×32 favicon: white `◐` on a dark gradient
- Larger: use the wordmark + small mark

### Why not an icon system?
Icons require maintenance, look dated within years, and need design talent we don't want to commit to. A great wordmark with a deliberate type choice ages decades.

---

## 3. The Color System

I'm choosing **Dark-mode-first with elegant light mode**, because:
1. The cert engine, quiz timer, and code-heavy quizzes all read better in dark
2. Differentiates from the bright-white Coursera/Udacity world
3. RRRTX brand already leans into the "RRRTX.OS" terminal aesthetic
4. Modern audiences expect dark mode as default

### The Palette (named, principled)

#### Core neutrals (the canvas)
```
ink-950    #0A0A0B    /* near-black, primary background        */
ink-900    #111114    /* card background                       */
ink-800    #18181C    /* elevated surface                      */
ink-700    #232328    /* border default                        */
ink-600    #3A3A42    /* divider strong                        */
ink-500    #6B6B75    /* placeholder text, disabled            */
ink-400    #9999A3    /* secondary text                        */
ink-300    #C7C7CF    /* primary text on dark                  */
ink-200    #E8E8EC    /* high-emphasis text on dark            */
ink-100    #F4F4F6    /* light-mode background                 */
ink-50     #FAFAFB    /* light-mode hero background            */
```

#### Accent: SAFFRON (the "earned it" color)
The single accent. Used for: CTAs, the timer, the score number, the cert highlight, the verification ✓.
```
saffron-600   #E8843C   /* primary accent — buttons, focused state */
saffron-500   #F49B5A   /* hover state                            */
saffron-400   #F8B27D   /* gradient stop                          */
saffron-300   #FBC9A1   /* light accent on dark bg                */
```
**Why saffron, not blue?** Every tech product uses blue. Saffron is warm, earthy, less corporate, and connects to "achievement" emotionally without being yellow (which reads as "warning"). Easy to make accessible (4.5:1 ratio with ink-950).

#### Semantic colors (used SPARINGLY — only when meaning is functional)
```
success-500   #2DAA73   /* passed, verified                  */
warning-500   #E5B53A   /* violation warning                 */
danger-500   #DE4D4D   /* failed, force-submit, error       */
info-500     #5B8DEE   /* informational hints               */
```

#### Special: The Certificate Palette (used ONLY on certs)
The cert has its own micro-palette so it feels distinct, not like another app screen.
```
cert-bg          #FBF8F3   /* warm off-white, "good paper"       */
cert-ink         #1A1610   /* near-black with warm undertone     */
cert-gold        #B8923D   /* the seal & signature line          */
cert-gold-deep   #8A6B22   /* gold pressed-in shadow effect      */
cert-rule        #D9CFBC   /* hairline border                    */
```
**No purple, no neon. Real certificates feel like cream paper with subtle ink. We honor that.**

### Color usage rules (the discipline)
1. **One accent at a time** on any screen. Saffron is precious — overusing it kills its power.
2. **Semantic colors only for semantic meaning.** Don't use success-green just because "this section is positive."
3. **Gradients exist only in 2 places:** (a) the hero saffron→ink fade on the landing page, (b) the certificate seal.
4. **Cert palette never mixes with app palette.** When you see the cert page, it should feel like opening an envelope.

---

## 4. Typography System

Type does 70% of the heavy lifting. Get this right and everything else feels intentional.

### The Type Stack (3 fonts only — discipline)

| Role | Font | Weights | Why |
|---|---|---|---|
| **Display / hero** | `Instrument Serif` | 400 | Editorial, warm, distinctive. Used ONLY for hero headlines and the user's name on the certificate. Free on Google Fonts. |
| **UI / body** | `Geist` (Vercel's font) | 400, 500, 600, 700 | Designed for screens, exceptional clarity at small sizes, modern but not trendy. Free, OFL license. |
| **Code / monospace** | `Geist Mono` | 400, 500, 600 | Cert IDs, code blocks in quiz questions, RRRTX.OS aesthetic terminal vibes, the logo. |

**Why these three:**
- Two sans-serifs (Instrument Sans + Geist) would feel flat. The serif/sans contrast adds editorial sophistication that says "this is a real publication, not another SaaS."
- Geist + Geist Mono share design DNA → automatic harmony.
- All three are free, fast-loading, and globally CDN-cached.

**Fallback stack:** `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` — never let users see Times New Roman.

### Type scale (modular, ratio 1.250)

| Token | Size | Line height | Use |
|---|---|---|---|
| `text-display-2xl` | 72px (4.5rem) | 1.05 | Hero headlines (landing only) |
| `text-display-xl` | 60px (3.75rem) | 1.05 | Page heroes |
| `text-display-lg` | 48px (3rem) | 1.1 | Section headlines |
| `text-display-md` | 36px (2.25rem) | 1.15 | Subsection headlines |
| `text-display-sm` | 30px (1.875rem) | 1.2 | Quiz card titles |
| `text-xl` | 20px (1.25rem) | 1.5 | Lead paragraphs, quiz questions |
| `text-lg` | 18px (1.125rem) | 1.5 | Quiz options, body emphasized |
| `text-base` | 16px (1rem) | 1.6 | Default body |
| `text-sm` | 14px (0.875rem) | 1.5 | Secondary text, labels |
| `text-xs` | 12px (0.75rem) | 1.4 | Captions, metadata, cert ID |
| `text-mono-sm` | 13px (0.8125rem) | 1.4 | Code, IDs, timestamps |

### Typography rules
- **Quiz question text:** `text-xl Geist 500` — large, readable, never crammed
- **Quiz options:** `text-lg Geist 400` — equal weight (don't make any option look "more important")
- **The user's name on the cert:** `Instrument Serif 400` at 56px — this is the showpiece moment
- **Cert ID everywhere:** `Geist Mono 500` — looks like a real serial number, not random text
- **Body copy max width:** `65ch` always — never run text edge-to-edge

---

## 5. Spacing, Layout, Radius

### Spacing scale (4px base — Tailwind-compatible)
```
0.5 = 2px,  1 = 4px,   2 = 8px,   3 = 12px,  4 = 16px,
5 = 20px,   6 = 24px,  8 = 32px,  10 = 40px, 12 = 48px,
16 = 64px,  20 = 80px, 24 = 96px, 32 = 128px
```
Default vertical rhythm between sections: **80-128px on desktop, 48-64px on mobile**.

### Container widths
- `container-prose`: `max-w-2xl` (672px) — for reading content
- `container-app`: `max-w-5xl` (1024px) — for the quiz player and dashboard
- `container-marketing`: `max-w-6xl` (1152px) — for landing sections
- `container-cert`: 297mm × 210mm (A4 landscape) — exact PDF dimensions

### Border radius scale
```
rounded-sm    4px    /* tags, small chips                          */
rounded-md    8px    /* inputs, small buttons                      */
rounded-lg    12px   /* default for cards, options, primary buttons */
rounded-xl    16px   /* quiz cards, prominent surfaces             */
rounded-2xl   24px   /* modals, hero containers                    */
rounded-full  9999px /* avatars, status pills                      */
```

### Elevation (shadows — used SPARINGLY in dark mode)
Dark UI rarely needs heavy shadows. We use **borders for separation, glow for emphasis**.
```
shadow-soft      0 1px 2px rgba(0,0,0,0.3)
shadow-card      0 4px 16px rgba(0,0,0,0.4)
shadow-cert      0 24px 48px rgba(0,0,0,0.5)  /* cert hover/preview */
glow-saffron     0 0 24px rgba(232,132,60,0.3) /* focus accent */
```

---

## 6. Motion Design

Motion is signal, not decoration. Three principles:

1. **Fast by default** (150–250ms for UI transitions)
2. **One thing moves at a time** (never a "choreographed" entrance)
3. **Respect `prefers-reduced-motion`** — disable everything non-essential

### Timing tokens
```
duration-instant   100ms   /* hover state changes              */
duration-fast      200ms   /* button press, toast appear       */
duration-base      300ms   /* default UI                       */
duration-slow      500ms   /* page transitions, modal enter    */
duration-cert      1200ms  /* cert reveal hero animation       */
```

### Easing curves
```
ease-out-expo    cubic-bezier(0.16, 1, 0.3, 1)   /* default — feels "released" */
ease-in-out      cubic-bezier(0.4, 0, 0.2, 1)    /* state transitions */
ease-spring      cubic-bezier(0.34, 1.56, 0.64, 1) /* the cert reveal */
```

### Signature motion moments (3 places where motion is the product)

#### A. The "Quiz Start" handshake (HackerRank-style enter Secure Mode)
- User clicks "Begin Secure Quiz" → 800ms transition:
- Screen darkens at edges (vignette fades in)
- Card with quiz question scales in from 0.96 to 1.0
- The timer bar fills its starting state
- Subtle vibration of the `Esc to exit fullscreen will auto-submit` warning
- Feels like a console saying "we're locked in now"

#### B. The "Score Reveal" (the moment they see if they passed)
- Number animates from 0 to actual score over 800ms (`ease-out-expo`)
- IF ≥80: saffron glow expands behind the number, then "CERTIFIED" lockup fades in (one beat after the number lands)
- IF <80: number stops, gentle red underline appears, "Try again in 24h" appears (no shame, just facts)
- No confetti by default (cheap). One subtle saffron particle burst behind the cert if they passed.

#### C. The "Certificate Lift" (the screenshot-worthy moment)
- Cert starts as a flat thumbnail, scales up to fill the viewport with a subtle 3D tilt (rotateY 4deg)
- Gold seal at bottom-right does a soft pulse-once animation
- The user's name "stamps in" with a 1.2s `ease-spring` from slightly offset
- This is the moment people screenshot. **It is the most-designed moment in the entire product.**

### Where motion does NOT belong
- ❌ No animated mesh gradients on the homepage hero (overdone, expensive)
- ❌ No floating background blobs
- ❌ No icon micro-animations on every hover
- ❌ No parallax scrolling (vestibular issues, slow on mobile)
- ❌ No 3D landing scene with rotating objects (kills mobile, distracts from the offer)

### About Spline / Threlte / Three.js
I researched the references you sent. My recommendation: **don't ship 3D in v1.** Here's why:
- Spline scenes add 500KB-3MB to first load (kills mobile metric scores)
- Mobile performance is genuinely bad for sustained 3D
- It signals "we tried hard to look impressive" rather than "we just are"
- Stripe, Linear, Vercel — the design references everyone respects — use almost zero 3D in their core flows

**If you want one 3D moment later (v2),** the right place is a celebratory cert reveal scene (cert floating in space with light hitting the gold seal). We can use `@react-three/fiber` (the React Three.js wrapper) at that point. Don't build it now.

---

## 7. The Iconography System

**Decision: lucide-react icons only.** No custom icon set, no mixing of icon libraries.

- Default stroke width: **1.5px** (thinner than the lucide default 2px — looks more refined)
- Default size: 20px in UI, 24px in larger contexts, 16px in compact metadata
- Color: always inherits from text — never colored by default

### Special iconographic moments
- The "lock" icon when Secure Mode activates (subtle pulse animation on engage)
- The "shield-check" icon next to the cert ID in verification
- The "sparkle" icon next to AI-related quiz cards (only those)
- The "github" icon next to the cert registry link

### Emojis vs icons
- **In the app UI:** lucide icons only (consistency)
- **For quiz card identifiers:** emojis are OK (🧠 ✨ 🎨 etc. — they're warm, instantly scannable, and we already have them)
- **In marketing/landing copy:** sparingly, like punctuation

---

## 8. Complete Screen Map

This is every screen the user will see. Each one is named, has a clear purpose, and maps to existing backend code.

### Public flow (no account needed)
```
/                           → Landing (Hero + 15 quiz cards + how it works)
/quizzes                    → Browse all 15 quizzes (filter by category)
/quiz/[id]                  → Quiz overview page (rules + start button)
/quiz/[id]/take             → THE QUIZ (Secure Mode active)
/quiz/[id]/result           → Score + cert generation
/cert/[certId]              → Public certificate view (the shareable URL)
/verify                     → Verify any cert by ID
/verify?id=RFV-...          → Auto-filled verify view
/u/[slug]                   → Public profile (lists user's certs)
/about                      → About + honest disclaimers
```

### Local-state flow (uses localStorage, no auth)
```
/me                         → My certificates (read from localStorage)
/me/export                  → Download all my data as JSON
/me/import                  → Upload JSON to sync across devices
```

### System
```
/api/issue-cert             → POST endpoint (Vercel Edge Function — already built)
404, 500                    → Custom error pages with personality
```

---

## 9. Screen-by-Screen Design Specs

### SCREEN 1: Landing page `/`

**Goal:** Convince a stranger in 5 seconds that this is real, free, and worth doing.

```
┌─────────────────────────────────────────────────────────────┐
│  rrrtx freeverse                       Browse  Verify  ◐    │   ← Sticky nav
├─────────────────────────────────────────────────────────────┤
│                                                             │
│         [small saffron pill: "100% free. forever."]         │
│                                                             │
│         Skills you earned.                                  │   ← Instrument Serif 72px
│         Certificates you own.                               │   ← saffron color for second line
│                                                             │
│         15 quizzes · 1,500 questions · 1 standard           │   ← Geist Mono small
│                                                             │
│         [ Start a quiz → ]  [ Verify a cert ]               │   ← saffron primary + ghost
│                                                             │
│         No login required. Take it. Pass it. Own it.        │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│         How it works                                        │   ← Section header
│                                                             │
│         01.  Pick a quiz       02. Pass with 80%+          │
│         02.  Get your cert     03. Verify forever          │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│         Choose your test                                    │
│                                                             │
│         [ 15 cards in a 3-column grid → ]                  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│         What makes this different                           │
│                                                             │
│         ✓ No paywall, no upsell, no "premium tier"         │
│         ✓ Cryptographically verifiable certificates         │
│         ✓ Question pool: 100 per topic, 20 per attempt     │
│         ✓ Secure Mode (full-screen, anti-cheat)            │
│         ✓ Open source registry on GitHub                    │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  © RRRTX FreeVerse. Built by Ahmad. MIT licensed.           │
└─────────────────────────────────────────────────────────────┘
```

**Background treatment:** Solid `ink-950` with a SINGLE subtle saffron→transparent radial gradient at top-right of the hero. NO mesh gradients, NO 3D objects, NO floating elements. The restraint is the message.

### SCREEN 2: Quiz card (the home grid item)

Each card represents one quiz. 3-column grid on desktop, 1 column on mobile.

```
┌─────────────────────────────────┐
│                                 │
│  🧠                       AI    │   ← emoji big, category small in ink-500
│                                 │
│  Prompt Engineering             │   ← Geist 600 24px
│  Fundamentals                   │
│                                 │
│  Master the art of communic-    │   ← Geist 400 14px ink-400
│  ating with AI models.          │
│                                 │
│  ─────────────────────────────  │   ← hairline ink-800
│                                 │
│  20 questions · 20 min · 80%    │   ← Geist Mono 12px ink-500
│                                 │
│  Start →                        │   ← saffron, becomes solid on hover
│                                 │
└─────────────────────────────────┘
```

**Card states:**
- Default: `ink-900` background, `ink-800` border
- Hover: border becomes `saffron-600`, very subtle scale to 1.01, 200ms
- Has a cert already: a small `✓` icon in top-right corner

### SCREEN 3: Quiz overview `/quiz/[id]`

**The "are you ready?" moment.** This is where we set expectations crystal clear, like HackerRank's pre-test screen.

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to quizzes                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🧠                                                         │   ← emoji 64px
│                                                             │
│  Prompt Engineering Fundamentals                            │   ← display-md
│  Master the art of communicating with AI.                   │   ← text-xl ink-400
│                                                             │
│  ┌────────────┬────────────┬────────────┬────────────┐    │
│  │ Questions  │ Time       │ To pass    │ Pool size  │    │
│  │ 20         │ 20 min     │ 80%        │ 100        │    │   ← stat tiles
│  └────────────┴────────────┴────────────┴────────────┘    │
│                                                             │
│  Before you begin                                           │   ← section header
│                                                             │
│  This quiz uses Secure Mode. By starting, you agree to:     │
│                                                             │
│  ◉  Stay in fullscreen mode                                 │
│  ◉  Not switch tabs or windows                              │
│  ◉  Not copy or paste content                               │
│  ◉  Complete without external help                          │
│                                                             │
│  3 violations will auto-submit your attempt.                │
│  Your certificate will reflect your integrity record.       │
│                                                             │
│  Your name              [_________________________]         │   ← inputs for cert
│  Your email             [_________________________]         │
│                                                             │
│  [ I agree. Begin Secure Quiz → ]                           │   ← Big saffron button
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**The pre-quiz consent is critical.** This is exactly HackerRank's pattern. Name + email captured here become the cert recipient (hashed for the registry, plaintext on the cert PDF).

### SCREEN 4: THE QUIZ `/quiz/[id]/take`

This is the most important screen. It must be **distraction-free, single-focus, calm under pressure**.

```
┌─────────────────────────────────────────────────────────────┐
│  Prompt Engineering Fundamentals    │  18:42  │  Q 7 of 20  │  ← Top bar (fixed)
│  ●●●●●●●○○○○○○○○○○○○○                                       │  ← progress dots
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                                                             │
│         Question 7                                          │   ← Geist Mono ink-500 sm
│                                                             │
│         What is 'chain-of-thought' prompting?               │   ← text-xl Geist 500
│                                                             │
│                                                             │
│         ┌─────────────────────────────────────────────┐   │
│         │ A   Asking the model to show its step-by-   │   │   ← Each option is a card
│         │     step reasoning before answering         │   │     ink-800 → saffron border on hover
│         └─────────────────────────────────────────────┘   │
│                                                             │
│         ┌─────────────────────────────────────────────┐   │
│         │ B   Connecting multiple AI models           │   │
│         │     together in a sequence                  │   │
│         └─────────────────────────────────────────────┘   │
│                                                             │
│         ┌─────────────────────────────────────────────┐   │
│         │ C   A method of compressing prompts         │   │
│         └─────────────────────────────────────────────┘   │
│                                                             │
│         ┌─────────────────────────────────────────────┐   │
│         │ D   Encrypting prompts with a hash chain    │   │
│         └─────────────────────────────────────────────┘   │
│                                                             │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  ← Previous                       [Skip]    [Next →]        │   ← Bottom bar (sticky)
└─────────────────────────────────────────────────────────────┘
```

**Critical UX details:**
- **One question per screen** — no scrolling within a question. Forces focus.
- **Timer:** top bar, color shifts: ink-300 → warning-500 at 5min left → danger-500 at 1min left
- **Progress dots:** answered = saffron, current = saffron outlined, unanswered = ink-600
- **Click anywhere on an option card** to select (not just radio button — big tap target)
- **Selected option:** saffron 1.5px border + faint saffron background tint
- **Keyboard shortcuts:** 1/2/3/4 to select, ←/→ to nav, Enter to next
- **Question grid:** small button bottom-left opens a 4×5 grid showing answered/unanswered state, lets user jump
- **Right side / bottom-right corner:** a tiny `Secure Mode ●` indicator with a small green dot (pulses if violation occurs)

**Violation warnings:** When secure mode triggers, a **modal slides in from the top** (not a full overlay — partial, you can still see your question), red border, says: *"Warning 1 of 3: Tab switch detected. Stay in fullscreen to continue."* → 5 seconds → auto-dismisses.

**At violation 3:** full overlay, no escape, "Auto-submitting in 3..2..1" — then submit happens.

### SCREEN 5: Score Reveal `/quiz/[id]/result`

This is the emotional payoff. Pass or fail, this should feel respectful.

#### IF PASSED (score ≥ 80):
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                                                             │
│                                                             │
│                                                             │
│                  ── certified ──                            │   ← saffron divider
│                                                             │
│                                                             │
│                       92                                    │   ← Instrument Serif 120px saffron
│                                                             │
│                                                             │
│                  out of 100                                 │   ← Geist 18 ink-400
│                                                             │
│                                                             │
│         Prompt Engineering Fundamentals                     │   ← Geist 500 24
│                                                             │
│         Issued to Muhammad Ahmad                            │   ← ink-300
│         Cert ID  RFV-2026-A3F9C2B8                          │   ← Geist Mono saffron
│                                                             │
│                                                             │
│         [ View certificate → ]   [ Download PDF ]           │   ← saffron + ghost
│                                                             │
│         Share:  𝕏  in  🔗                                   │   ← share icons
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### IF NOT PASSED (score < 80):
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                       64                                    │   ← Instrument Serif 120px ink-300
│                                                             │
│                  out of 100                                 │
│                                                             │
│         You needed 80 to pass.                              │   ← ink-400
│         You'll see different questions next time.           │
│                                                             │
│         Available to retake:  Mar 14, 2026                  │
│         (24h cooldown after a failed attempt)               │
│                                                             │
│         [ Review your answers ]   [ Browse other quizzes ]  │
│                                                             │
│         Topics where you struggled:                         │   ← honest, useful
│         · Chain-of-thought reasoning  (1/3 correct)         │
│         · Output format control       (2/4 correct)         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**No shame, no fake encouragement. Just honest data and a clear next step.**

### SCREEN 6: The Certificate Page `/cert/[certId]`

**This is the most-designed screen in the entire product.** It must look like something you'd frame on a wall.

```
URL bar: rrrtx-freeverse.app/cert/RFV-2026-A3F9C2B8

┌─────────────────────────────────────────────────────────────┐
│  ← Back        cert RFV-2026-A3F9C2B8       Download · Share│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │   ┌───────────────────────────────────────────┐    │   │
│  │   │                                           │    │   │
│  │   │       [Centered: gold hairline border]    │    │   │
│  │   │                                           │    │   │
│  │   │       rrrtx · freeverse                   │    │   │  ← Geist Mono 12px cert-ink
│  │   │                                           │    │   │
│  │   │       CERTIFICATE OF ACHIEVEMENT          │    │   │  ← uppercase Geist 14 tracking-widest cert-gold
│  │   │                                           │    │   │
│  │   │                                           │    │   │
│  │   │   This is to certify that                 │    │   │  ← Geist 16 cert-ink/70
│  │   │                                           │    │   │
│  │   │                                           │    │   │
│  │   │          Muhammad Ahmad                   │    │   │  ← Instrument Serif 56px cert-ink
│  │   │                                           │    │   │
│  │   │   ─────────────────────────────────       │    │   │  ← cert-gold hairline
│  │   │                                           │    │   │
│  │   │   has successfully demonstrated            │    │   │
│  │   │   proficiency in                          │    │   │
│  │   │                                           │    │   │
│  │   │   Prompt Engineering Fundamentals         │    │   │  ← Geist 600 28px
│  │   │                                           │    │   │
│  │   │   with a score of 92/100 on Mar 13, 2026  │    │   │
│  │   │                                           │    │   │
│  │   │                                           │    │   │
│  │   │  ┌────────┐                  ┌───────┐    │    │   │
│  │   │  │  [QR]  │                  │  [◐]  │    │    │   │  ← QR (left) + gold seal (right)
│  │   │  │        │                  │  GOLD │    │    │   │
│  │   │  └────────┘                  │  SEAL │    │    │   │
│  │   │  Verify at                   └───────┘    │    │   │
│  │   │  rrrtx-freeverse.app/verify              │    │   │
│  │   │                                           │    │   │
│  │   │  RFV-2026-A3F9C2B8           ahmadrrrtx  │    │   │  ← cert ID + issuer name
│  │   │                                           │    │   │
│  │   └───────────────────────────────────────────┘    │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Authenticity                                               │
│  ✓ Cryptographically verified                               │
│  ✓ Recorded in public GitHub registry                       │
│  ✓ Issued in Secure Mode with 0 violations                  │
│                                                             │
│  [ Add to LinkedIn ]   [ Copy share link ]   [ Download PDF]│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**The cert paper itself:**
- Off-white (`cert-bg: #FBF8F3`) — feels like good paper
- Inside, a subtle 2px gold hairline rule frames everything (40px margin inside the white card)
- Very subtle paper texture (SVG noise pattern at 3% opacity)
- The gold seal is a custom SVG using the `◐` mark with rays radiating outward — looks pressed-in via inner shadow
- The user's name is the visual hero. Instrument Serif. Generous spacing. Centered.
- Cert ID is bottom-left in Geist Mono with a subtle gold underline
- QR code is bottom-left, the seal bottom-right (golden ratio composition)

**Print/PDF version:** Identical to the screen version but at exactly 297mm × 210mm (A4 landscape), generated via jsPDF + html2canvas (already in `src/lib/pdfGenerator.ts`).

### SCREEN 7: Verification page `/verify`

**The trust-building moment.** This is what employers/recruiters will see.

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Verify a Certificate                                       │
│                                                             │
│  Enter a certificate ID to check its authenticity.          │
│                                                             │
│  [ RFV-2026-A3F9C2B8                                    ]   │   ← big monospace input
│                                                             │
│  [ Verify → ]                                               │
│                                                             │
│                                                             │
│  ─────────── if verified ───────────                        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ✓ Authentic Certificate                            │   │   ← saffron checkmark
│  │                                                     │   │
│  │  Issued to        Muhammad Ahmad                    │   │
│  │  For              Prompt Engineering Fundamentals   │   │
│  │  Score            92/100                            │   │
│  │  Issued on        March 13, 2026                    │   │
│  │  Integrity        Completed in Secure Mode          │   │
│  │                   0 violations recorded             │   │
│  │  Source           Public GitHub registry            │   │
│  │                   github.com/ahmadrrrtx/.../...     │   │
│  │                                                     │   │
│  │  [ View full certificate → ]                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**If NOT verified:**
- Red border, clear message
- *"This certificate ID could not be verified. It may be fake, mistyped, or revoked."*
- Help text below: *"Cert IDs start with RFV- followed by year and 8 hex characters."*

### SCREEN 8: My Certs `/me`

```
┌─────────────────────────────────────────────────────────────┐
│  Your certificates                                          │
│                                                             │
│  Stored locally on this device. Export to sync.             │
│                                                             │
│  ┌──────────────────┬──────────────────┬──────────────────┐│
│  │ 🧠 Prompt Eng    │ ⚛️ React Basics  │ 🐍 Python Fund   ││
│  │ Score 92         │ Score 88         │ Score 95         ││
│  │ Mar 13, 2026     │ Feb 28, 2026     │ Feb 15, 2026     ││
│  │ View · Download  │ View · Download  │ View · Download  ││
│  └──────────────────┴──────────────────┴──────────────────┘│
│                                                             │
│  [ Export all (.json) ]   [ Import from file ]              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### SCREEN 9: Public profile `/u/[slug]`

(This is what someone sees when you share `rrrtx-freeverse.app/u/muhammad-ahmad`)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                  Muhammad Ahmad                             │
│                  3 certifications                           │
│                                                             │
│  [3 cert cards in a row]                                    │
│                                                             │
│  All certificates verified against public registry.         │
│  Verify each independently at .../verify                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. Component Library (the building blocks)

Every screen above is built from these atoms. I'm specifying them so they're consistent across the codebase.

### Buttons
| Variant | Use | Style |
|---|---|---|
| `Button.Primary` | Main CTA per screen | Saffron bg, ink-950 text, rounded-lg, 12px padding |
| `Button.Ghost` | Secondary actions | Transparent, ink-200 text, ink-700 border |
| `Button.Link` | Tertiary, inline | Saffron text, underline on hover |
| `Button.Danger` | Destructive (rare) | danger-500 border, danger-500 text |

All buttons:
- 44px minimum height (touch target)
- Loading state: spinner replaces text, button stays width
- Disabled state: 40% opacity, no hover
- Focus state: saffron 2px outline, 4px offset (accessibility)

### Cards
| Variant | Use |
|---|---|
| `Card.Quiz` | Homepage grid |
| `Card.Stat` | Numbers (Questions, Time, Pass score) |
| `Card.Option` | Quiz answer options |
| `Card.Cert` | Certificate preview |

### Form fields
- Label always above input (not floating)
- Input: ink-900 bg, ink-700 border, rounded-md, 12px padding
- Focus: saffron border + saffron glow
- Error: danger border + helper text below

### The `<Cert>` component
This is its own React component (`src/components/Certificate.tsx`):
- Accepts: `name`, `quiz`, `score`, `certId`, `date`, `integrity`
- Renders the cert design at any size (used in: full cert page, preview thumbnails, PDF generation)
- Has a `forPdf={true}` prop that switches to exact A4 dimensions

---

## 11. Mobile / Responsive Strategy

### Breakpoints
```
sm:  640px   — phones large
md:  768px   — tablets portrait
lg:  1024px  — tablets landscape, small desktop
xl:  1280px  — desktop default
2xl: 1536px  — large desktop
```

### Mobile-first decisions
- Quiz player: identical UX on mobile (one question per screen) — just stack vertically
- Quiz cards: 1 column on mobile, 2 on tablet, 3 on desktop
- Cert page: cert scales down proportionally, still readable at 375px wide
- Cert PDF: always A4 landscape (when downloaded), regardless of device

### Mobile-specific
- **Cannot enter true fullscreen on iOS Safari** (browser limitation). Secure Mode falls back to: tab-switch detection still works, force-fullscreen replaced by a banner reminding user to stay in the tab.
- **Touch targets minimum 44×44px** everywhere
- **No hover-only interactions** — every hover state has a touch-equivalent

---

## 12. Accessibility (WCAG AA minimum)

- All saffron-on-ink combos verified for 4.5:1 contrast (text) and 3:1 (UI)
- Every interactive element keyboard-reachable
- Visible focus indicators (saffron outline)
- All form labels properly associated
- ARIA labels on icon-only buttons
- `prefers-reduced-motion` respected — disable certificate reveal animation, no cert hover tilt
- `prefers-color-scheme: light` → ships a clean light theme
- Quiz timer has aria-live polite for screen readers
- Violation warnings have role="alert"

---

## 13. The Tech Stack (decisions, mapped to backend)

| Layer | Choice | Why |
|---|---|---|
| Framework | **Vite + React 18 + TypeScript** | Already in `package.json`. Fast HMR. |
| Routing | **React Router 6** | Standard SPA routing. |
| Styling | **Tailwind CSS** + **CSS variables** for theming | Token-based, dark mode trivial. |
| Components | **Hand-built** (NOT shadcn) | Custom design language; shadcn looks generic. We build ~12 atoms only. |
| State | **Zustand** for app state, **localStorage** for persistence (via existing `src/lib/storage.ts`) | Already in stack. |
| Animation | **Framer Motion** | Industry standard, respects reduced-motion. |
| Icons | **lucide-react** at 1.5px stroke | Already in deps. |
| Fonts | **Geist + Geist Mono** (self-hosted) + **Instrument Serif** (Google Fonts) | All free, fast. |
| PDF | **jsPDF + html2canvas** (already in `pdfGenerator.ts`) | Client-side, no server. |
| QR | **qrcode** (already in deps) | Self-contained. |
| Crypto | **Web Crypto API** (already in `src/lib/crypto.ts`) | Native, no deps. |
| Secure Mode | **Already built in `src/lib/secureMode.ts`** | Just wire into the quiz player. |
| Backend | **None for v1.** GitHub registry via `api/issue-cert.ts` Edge Function (already built) | Static-first. |
| Deployment | **Vercel** | Already configured. |

### What we are NOT using
- ❌ Three.js / R3F / Threlte / Spline — out of scope for v1
- ❌ Next.js — Vite is simpler for SPA, Vercel still deploys perfectly
- ❌ shadcn/ui — too recognizable, would dilute our distinct visual identity
- ❌ Material UI / Chakra / Ant — heavy, generic, fight our design system
- ❌ Authentication system — localStorage + export/import is enough for v1
- ❌ Backend database — files in GitHub repo IS the database

---

## 14. The Build Order (proposed phasing)

Once you say "go," I'd suggest this order:

| Phase | What | Why first |
|---|---|---|
| **A** | Tokens + Tailwind config + base layout shell | Foundation everything else uses |
| **B** | Atom components (Button, Card, Input, etc.) | Building blocks |
| **C** | The `<Certificate>` component (HTML + PDF export) | The hero piece. Build it gorgeous first; everything else gets compared to this. |
| **D** | Quiz player + Secure Mode integration | Core product loop |
| **E** | Pre-quiz consent screen + Result screen | Quiz flow complete |
| **F** | Home page + quiz grid | Landing experience |
| **G** | Verify page + cert page (public URLs) | Trust layer |
| **H** | My certs + profile + export/import | Personalization |
| **I** | About page, 404, polish, accessibility audit | Production-ready |
| **J** | Deploy to Vercel + wire GitHub registry | Live |

**Why cert first (phase C):** The cert is the screenshot people share. Get that right and the rest of the product gets a halo from it. Build the hero piece first; everything else lives up to it.

---

## 15. Decisions Locked In (single source of truth)

| Decision | Choice |
|---|---|
| Default theme | **Dark mode** |
| Primary accent | **Saffron `#E8843C`** |
| Logo | **Wordmark only** (`rrrtx freeverse`, lowercase) |
| Display font | **Instrument Serif** (hero + cert name only) |
| UI font | **Geist** |
| Mono font | **Geist Mono** |
| Component library | **Hand-built**, not shadcn |
| 3D | **None in v1** |
| Animation library | **Framer Motion** |
| Cert format | **A4 landscape, off-white, gold accents** |
| Cert name typography | **Instrument Serif 56px** |
| Mobile fullscreen fallback | **Banner reminder** (iOS limitation) |
| Authentication | **None — localStorage + crypto-verifiable certs** |
| Backend | **GitHub registry via Vercel Edge Function only** |

---

## 16. Honest Trade-offs You Should Know

1. **No 3D / no Spline.** You asked me to look at it. I think shipping it in v1 hurts more than helps (performance, signal). I'd revisit in v2 for ONE moment: the cert reveal scene.
2. **No shadcn/ui.** I know it's popular and fast. But every shadcn app starts to look the same. Your brand deserves a distinct visual identity. We build ~12 atoms ourselves — it's not that much more work.
3. **Dark-mode default.** Some users prefer light. We ship light theme too, but dark is the default identity. If you disagree, easy to flip.
4. **Saffron as the only accent.** Tempting to add blue / purple / teal "for variety." Resist. One accent = brand recognition. Look at Stripe (purple), Linear (blue-purple), Vercel (black-and-white). All single-accent.
5. **No login.** Means cert history lives per-device. Export/import covers cross-device. Adding real auth (Clerk/Auth0/Supabase) would compromise the "zero backend, fully free" story. v2 if needed.

---

## 17. Inspiration Captured (what we're emulating)

| What we love | From where |
|---|---|
| Editorial typography in tech UIs | Linear, Anthropic Claude |
| Restrained dark mode | Vercel, GitHub |
| Letting white space breathe | Apple HIG, Stripe Docs |
| One bold accent color | Stripe (purple), Linear (blue) |
| Cert as a paper artifact | Harvard, Apple, IBM certs |
| QR + crypto verification | Modern academic credentials |
| Pre-test consent transparency | HackerRank Secure Mode |
| "Free without compromise" feel | freeCodeCamp, MDN |

---

## ✅ Ready to build

Once you approve this plan (or tweak parts), I'll start with **Phase A** (tokens + Tailwind config) and **Phase C** (the Certificate component) — the foundation + the hero piece.

Three questions for you before I touch any code:

1. **Saffron or different accent?** Saffron is my recommendation. Alternates: cobalt blue, electric green, deep terracotta, soft lavender. Saffron differentiates from every other learning platform.

2. **Cert format: A4 landscape (Western/most global) or A4 portrait (more "modern" feel)?** I recommend landscape — it's the universal certificate format and prints best.

3. **One playful moment OR pure restraint?** Pure restraint = Vercel-style minimalism throughout. One playful moment = a single delight surprise (animated cert reveal, subtle Easter egg, generative profile art). I recommend ONE playful moment, on the cert reveal — that's the share-worthy emotional peak.

---

## 18. ✅ DECISIONS FINALIZED (after Ahmad's review)

These are now locked in. All future code follows these.

| Decision | Final choice |
|---|---|
| **Accent color** | **Saffron `#E8843C`** (single accent, used surgically) |
| **Cert format** | **A4 Landscape** (297mm × 210mm) — universal certificate shape |
| **Personality** | **Restraint everywhere + ONE playful moment on cert reveal** |
| **Performance priority** | **Smooth on all devices — explicit performance budget below** |

---

## 19. Performance Budget (the discipline behind "smooth on all devices")

Ahmad asked: must look best AND work smoothly on all devices. That's a real engineering constraint, not just a nice-to-have. Here are the hard limits we're committing to.

### Bundle size targets (production gzipped)
| Asset | Budget | Why |
|---|---|---|
| Initial JS bundle | **< 80KB** | Loads in <1s on 4G |
| Initial CSS | **< 15KB** | Tailwind purges aggressively |
| Total fonts | **< 50KB** | 3 fonts × WOFF2 subset (Latin only) |
| Largest single quiz JSON | **< 60KB** | Each ~25KB raw, ~6KB gzipped |
| Total initial load | **< 200KB gzipped** | First Contentful Paint < 1.5s on 3G |

### Loading strategy
- **Code splitting per route** — Vite handles this automatically. Quiz player code only loads when user clicks "Start quiz."
- **Quiz JSON loaded on demand** — never load all 15 quizzes upfront. Only fetch the one being taken.
- **Fonts loaded with `font-display: swap`** — text appears immediately in fallback, swaps when custom font ready.
- **PDF library (jsPDF + html2canvas) lazy-loaded** — only loads on the cert page, not in the main bundle (saves ~100KB from initial load).
- **QR library lazy-loaded** — same reasoning.
- **Framer Motion** — use the lean `framer-motion/dom` import where possible, tree-shake aggressively.

### Runtime performance targets
| Metric | Target | Tooling |
|---|---|---|
| Lighthouse Performance score (mobile) | **≥ 95** | Lighthouse CI |
| First Contentful Paint | **< 1.5s on 4G** | Web Vitals |
| Largest Contentful Paint | **< 2.5s on 4G** | Web Vitals |
| Cumulative Layout Shift | **< 0.05** | Web Vitals |
| Time to Interactive | **< 3s on 4G** | Lighthouse |
| 60fps animations | **Always — no jank** | Chrome DevTools Performance |

### Mobile-specific rules
- **No hover-dependent UX** — every hover state has a touch equivalent
- **Touch targets ≥ 44×44px** everywhere (Apple HIG standard)
- **No fixed-position sticky elements on iOS Safari** unless absolutely critical (they cause scroll jank)
- **Test on real low-end Android** — Moto G Power or similar, not just iPhone 15 Pro
- **iOS Safari fullscreen limitation** — handled by Secure Mode fallback (banner reminder instead)

### What we WON'T do (the discipline)
- ❌ No animated gradient backgrounds (GPU-expensive on low-end mobile)
- ❌ No parallax scrolling (causes scroll jank, vestibular issues)
- ❌ No 3D / WebGL on critical paths (mobile GPU varies wildly)
- ❌ No always-on background animations (battery drain)
- ❌ No more than 2 fonts loaded on any single page (FOUT prevention)
- ❌ No images >100KB on the landing page (compress aggressively, prefer SVG)
- ❌ No third-party analytics scripts that block render (defer if needed)
- ❌ No icon libraries beyond lucide-react (consistency + tree-shaking)

### Cross-device testing matrix (must work on all of these)
| Tier | Device class | Browser | Goal |
|---|---|---|---|
| Tier 1 | Modern iPhone (iOS 16+) | Safari | Flawless |
| Tier 1 | Modern Android (Chrome) | Chrome | Flawless |
| Tier 1 | Modern desktop | Chrome, Firefox, Safari, Edge | Flawless |
| Tier 2 | iPad (any year) | Safari | Excellent |
| Tier 2 | Low-end Android (4GB RAM) | Chrome | Smooth, full features |
| Tier 3 | Older Android (Android 9+) | Chrome | Functional, graceful degradation |
| Tier 3 | Old iPhone (iOS 14+) | Safari | Functional, graceful degradation |

### The one playful moment (the cert reveal animation) — performance constraints
- **Single CSS transform + opacity animation only** (cheap on all GPUs)
- **No particle systems, no canvas, no WebGL**
- **Total animation duration: 1.2s** (long enough to feel premium, short enough not to delay)
- **Skipped entirely if `prefers-reduced-motion`** is set
- **Animation runs on GPU compositor thread** (transform + opacity only — never animate width/height/top/left)

---

## 20. 🎬 The Cert Reveal Animation (the one playful moment — fully specced)

This is the only animated moment in the entire app. It needs to be perfect.

### The sequence (1.2 seconds total)
```
0.0s   Score number is visible from the previous screen
0.0s   User clicks "View certificate →"
0.0s   Page navigation begins (route change)
0.1s   Certificate page mounts
       Background fades from ink-950 to a subtle radial glow (saffron at 5% opacity, centered)
0.2s   Empty certificate paper card scales in from 0.92 → 1.0 (ease-spring, 600ms)
       Subtle shadow appears beneath (shadow-cert)
0.4s   Inside the paper, top-down reveal begins:
         - "rrrtx · freeverse" small wordmark fades in
         - "CERTIFICATE OF ACHIEVEMENT" tracking-widest text fades in
         - "This is to certify that" fades in
0.7s   THE NAME — Instrument Serif, 56px — stamps in
       Starts at scale(0.94) opacity(0) translateY(8px)
       Lands at scale(1) opacity(1) translateY(0)
       Easing: cubic-bezier(0.34, 1.56, 0.64, 1) — the spring "stamp" feel
       Duration: 500ms
1.0s   Quiz title fades in below
       Score line ("with a score of 92/100") fades in
1.1s   Gold seal (bottom right) appears with soft pulse
         - Scale: 0 → 1.0 with light bounce
         - Inner gold glow fades up
       QR code (bottom left) cross-fades in simultaneously
1.2s   "Add to LinkedIn" / "Download PDF" / "Share" buttons fade in below the cert
       Done.
```

### Reduced-motion fallback
If `prefers-reduced-motion: reduce`:
- All elements appear at final state instantly
- No scaling, no springs
- Background glow simplified to a static subtle gradient
- The moment is still respectful, just immediate

### Why this works
- **Single screen, single focus** — no other elements compete for attention
- **Sequential reveal** mimics how a printed cert is unveiled (top to bottom, then the seal)
- **The name is the hero** — gets the showcase moment
- **Performance: 100% GPU-composited** (transform + opacity only)
- **Cross-device: works identically** on phones, tablets, desktop (same animation, same timing)

### What's NOT in this animation
- ❌ No confetti
- ❌ No particle systems
- ❌ No 3D tilt
- ❌ No sound (auto-play audio is universally hated)
- ❌ No "scroll to reveal" — the whole thing happens in viewport

---

## 21. The Final Decision Summary

Everything for v1 build phase, in one block:

```
BRAND
  Name           rrrtx freeverse (lowercase, wordmark only)
  Tagline        Earn it. Verify it. Own it. Free.
  Cert prefix    RFV-

COLOR
  Theme          Dark mode default, light mode supported
  Accent         Saffron #E8843C (used surgically)
  Neutrals       11-step ink scale (#0A0A0B → #FAFAFB)
  Semantic       success #2DAA73, warning #E5B53A, danger #DE4D4D, info #5B8DEE
  Cert palette   bg #FBF8F3, gold #B8923D, ink #1A1610

TYPE
  Display        Instrument Serif (hero + cert name only)
  UI             Geist (Vercel's font, 400/500/600/700)
  Mono           Geist Mono

LAYOUT
  Spacing        4px base scale
  Radius         4/8/12/16/24/full
  Containers     prose 672px, app 1024px, marketing 1152px
  Cert           A4 landscape, 297mm × 210mm

MOTION
  Default        200-300ms, ease-out-expo
  Reduced-motion Respected — disable all non-essential
  Signature      ONE moment: cert reveal (1.2s, GPU-only, spring physics)

PERFORMANCE
  Initial JS     < 80KB gzipped
  Lighthouse     ≥ 95 on mobile
  FCP            < 1.5s on 4G
  Critical path  Quiz JSON loaded on-demand, PDF/QR lazy-loaded

STACK
  Vite + React 18 + TS + Tailwind + Framer Motion + lucide-react
  Hand-built components (no shadcn)
  No 3D / Spline / Three.js in v1
  Zustand for state, localStorage for persistence

INTEGRATIONS (all already built in backend)
  Secure Mode    src/lib/secureMode.ts
  Quiz engine    src/lib/quizEngine.ts
  Crypto/cert    src/lib/crypto.ts
  PDF gen        src/lib/pdfGenerator.ts
  GitHub reg     api/issue-cert.ts (Vercel Edge)
  Storage        src/lib/storage.ts

DEPLOYMENT
  Vercel free tier (already configured in vercel.json)
```

