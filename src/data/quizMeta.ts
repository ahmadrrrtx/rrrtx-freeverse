// ────────────────────────────────────────────────────────────
// RRRTX FreeVerse — Quiz catalog metadata
// Lightweight info shown on the home page. Full questions live in /quizzes/*.json
// All quizzes are equal — no difficulty levels. One standard, one cert.
// ────────────────────────────────────────────────────────────

import type { QuizMeta } from '../types';

export const QUIZ_CATALOG: QuizMeta[] = [
  // ── AI Era ────────────────────────────────────────────────
  { id: 'prompt-engineering',     title: 'Prompt Engineering Fundamentals', description: 'Master the art of communicating with AI models like ChatGPT, Claude, and Gemini.', category: 'AI',          icon: '🧠', estimatedMinutes: 20, totalQuestions: 100, perAttempt: 20 },
  { id: 'generative-ai-basics',   title: 'Generative AI Basics',            description: 'Understand how LLMs work, what they can do, and where they fall short.',         category: 'AI',          icon: '✨', estimatedMinutes: 20, totalQuestions: 100, perAttempt: 20 },
  { id: 'ai-productivity',        title: 'AI for Productivity',             description: 'Use AI tools to automate workflows, write faster, and ship more.',              category: 'AI',          icon: '⚡', estimatedMinutes: 20, totalQuestions: 100, perAttempt: 20 },

  // ── Web Development ───────────────────────────────────────
  { id: 'html-css',               title: 'HTML & CSS Fundamentals',         description: 'The building blocks of every website. Layouts, semantics, responsiveness.',      category: 'Web Dev',     icon: '🎨', estimatedMinutes: 20, totalQuestions: 100, perAttempt: 20 },
  { id: 'javascript-essentials',  title: 'JavaScript Essentials',           description: 'The language of the web. Variables, functions, async, DOM — the must-knows.',   category: 'Web Dev',     icon: '📜', estimatedMinutes: 20, totalQuestions: 100, perAttempt: 20 },
  { id: 'react-basics',           title: 'React Basics',                    description: 'Components, props, state, hooks. Build modern UIs with the most popular library.', category: 'Web Dev',  icon: '⚛️', estimatedMinutes: 20, totalQuestions: 100, perAttempt: 20 },
  { id: 'git-github',             title: 'Git & GitHub Workflow',           description: 'Version control every developer must master. Branches, PRs, conflicts.',         category: 'Web Dev',     icon: '🐙', estimatedMinutes: 20, totalQuestions: 100, perAttempt: 20 },

  // ── Data & Programming ────────────────────────────────────
  { id: 'python-fundamentals',    title: 'Python Fundamentals',             description: "The world's most popular language. Syntax, data types, control flow, functions.", category: 'Programming', icon: '🐍', estimatedMinutes: 20, totalQuestions: 100, perAttempt: 20 },
  { id: 'sql-databases',          title: 'SQL & Databases',                 description: 'Query, join, filter, aggregate. The universal language of data.',                category: 'Data',        icon: '🗄️', estimatedMinutes: 20, totalQuestions: 100, perAttempt: 20 },
  { id: 'data-analysis',          title: 'Data Analysis Basics',            description: 'Mean, median, distributions, visualizations. Turn raw data into insights.',      category: 'Data',        icon: '📊', estimatedMinutes: 20, totalQuestions: 100, perAttempt: 20 },

  // ── Career & Modern Skills ────────────────────────────────
  { id: 'digital-marketing',      title: 'Digital Marketing Fundamentals',  description: 'SEO, social, email, ads. The skills every founder and operator needs.',          category: 'Career',      icon: '📣', estimatedMinutes: 20, totalQuestions: 100, perAttempt: 20 },
  { id: 'cybersecurity',          title: 'Cybersecurity Essentials',        description: 'Threats, defenses, password hygiene, phishing. Protect yourself and your users.', category: 'Security',   icon: '🛡️', estimatedMinutes: 20, totalQuestions: 100, perAttempt: 20 },
  { id: 'uiux-design',            title: 'UI/UX Design Principles',         description: 'Heuristics, typography, color, hierarchy. Design that users actually love.',     category: 'Design',      icon: '🖌️', estimatedMinutes: 20, totalQuestions: 100, perAttempt: 20 },
  { id: 'no-code-automation',     title: 'No-Code & Automation',            description: 'Make.com, Zapier, n8n. Build powerful workflows without writing code.',          category: 'Career',      icon: '🔧', estimatedMinutes: 20, totalQuestions: 100, perAttempt: 20 },
  { id: 'cloud-basics',           title: 'Cloud Computing Basics',          description: 'AWS, Azure, GCP fundamentals. Compute, storage, networking, serverless, containers.', category: 'Career',  icon: '☁️', estimatedMinutes: 20, totalQuestions: 100, perAttempt: 20 },
];
