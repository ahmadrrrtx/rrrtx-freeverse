# 📝 RRRTX FreeVerse — Question Writing Standards
**The quality bar every question must meet.**
This is the rubric the team (you + me + future contributors) uses to keep certificates trustworthy.

---

## 🎯 The 8 Rules

### Rule 1: The stem is a complete, standalone question
- ✅ "What is the time complexity of binary search on a sorted array?"
- ❌ "Binary search is..." (incomplete sentence)
- A strong test: a knowledgeable student should be able to answer **before reading the options**.

### Rule 2: Exactly one option is indisputably correct
- All other 3 must be plausibly wrong, never "kinda also right".
- No "all of the above" / "none of the above" — research shows these dilute signal. [Source](https://poorvucenter.yale.edu/teaching/teaching-resource-library/designing-assessment-questions)

### Rule 3: Distractors target real misconceptions
- Best distractors come from "what would a half-prepared student honestly believe?"
- Bad distractor: "The model is made of cheese."
- Good distractor: "The model rewrites itself between calls." (sounds plausible to a beginner)

### Rule 4: Parallel structure across options
- All options should be roughly the same length, tone, and grammatical form.
- Asymmetry leaks the answer (the long detailed one is usually right).

### Rule 5: No negative phrasing unless essential
- ❌ "Which is NOT a feature of React?" (easy to misread)
- ✅ "Which of these is a feature of Vue but NOT React?" (only when contrast IS the point)

### Rule 6: Tests application, not just recall (Bloom's higher levels)
- Weak: "What does CSS stand for?" (pure recall)
- Strong: "A button looks fine in Chrome but is invisible in Safari. Which CSS property is the MOST likely cause?" (application)

### Rule 7: Every question has an explanation
- 1-3 sentences explaining WHY the correct answer is right.
- This is what separates a free quiz from a learning experience.

### Rule 8: Topic coverage by sub-pool
- 20 sub-pools per topic = 20 distinct micro-skills tested.
- 5 questions per sub-pool = same micro-skill, different angles.
- Picking 1 from each → every attempt covers all 20 skills.

---

## 🧪 The "Distractor Plausibility" Test

Before publishing a question, look at each wrong option and ask:
> *"Why might a real student genuinely pick this and be wrong?"*

If you can't answer that, replace the distractor.

**Example:**
Q: What is a 'prompt' in AI?
- A: ✅ "The input text given to an AI model that produces a response" (correct)
- B: "The CPU cycle time used to generate a response" (a tech-confused beginner might pick this)
- C: "The license fee paid to use the model" (a billing-confused beginner might pick this)
- D: "The internal weights of the neural network" (a CS-jargon-confused beginner might pick this)

Every distractor maps to a real conceptual mistake → great question.

---

## 🎨 The 4 Bloom's Levels We Test

| Level | Verb | Example stem |
|---|---|---|
| **Remember** | define, identify | "Which of these is a valid HTML5 tag?" |
| **Understand** | explain, classify | "Why does React re-render on state change?" |
| **Apply** | use, solve | "A user reports the button isn't clickable. Which CSS property would you check FIRST?" |
| **Analyze** | compare, distinguish | "What is the KEY difference between flexbox and grid?" |

**Target distribution per quiz:**
- 30% Remember (foundations)
- 30% Understand (concepts)
- 30% Apply (real-world)
- 10% Analyze (deeper)

---

## 🚫 Anti-patterns to AVOID

1. **Trick questions** — quizzes should test knowledge, not reading comprehension.
2. **Outdated info** — anything that changes faster than 6 months (e.g., specific model versions). Use evergreen phrasing: "modern LLMs" not "GPT-4-turbo-1106".
3. **Cultural in-jokes** — don't assume the test-taker knows specific memes, US sports, etc.
4. **Real names of paid products as the only correct answer** — feels like an ad. Use generic where possible.
5. **Questions about exact numbers that change** — token prices, context windows. Phrase abstractly.

---

## ✅ Pre-Publish Checklist (per question)

- [ ] Stem is a complete, standalone question
- [ ] Exactly one option is indisputably correct
- [ ] All 3 distractors map to plausible beginner misconceptions
- [ ] Options have parallel structure (similar length/grammar)
- [ ] No "all of the above" / "none of the above"
- [ ] Explanation is 1-3 clear sentences
- [ ] No outdated specifics (versions, prices, model names)
- [ ] Question can stand alone (no "see question 3 above")
- [ ] Tests skill, not trivia
- [ ] Reads naturally out loud

---

## 📊 The Reference Quiz

`src/quizzes/prompt-engineering.json` is the **gold standard**. Every other quiz should match its:
- Structural quality (20 sub-pools × 5 questions)
- Distractor craft
- Explanation depth
- Bloom's level distribution
- Coverage progression (basics → intermediate → patterns → production → future)
