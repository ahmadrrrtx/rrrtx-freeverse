// ────────────────────────────────────────────────────────────
// RRRTX FreeVerse — localStorage wrapper
// All user state lives here. No database needed.
// ────────────────────────────────────────────────────────────

import type { UserProfile, QuizResult, Certificate } from '../types';

const KEYS = {
  user: 'rfv:user',
  results: 'rfv:results',         // QuizResult[] (history of all attempts)
  certificates: 'rfv:certificates', // Certificate[]
} as const;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('[storage] write failed', e);
  }
}

// ── User profile ───────────────────────────────────────────
export const getUser = (): UserProfile | null => read(KEYS.user, null);
export const setUser = (u: UserProfile): void => write(KEYS.user, u);
export const clearUser = (): void => localStorage.removeItem(KEYS.user);

// ── Quiz results history ───────────────────────────────────
export const getResults = (): QuizResult[] => read(KEYS.results, []);
export const addResult = (r: QuizResult): void => {
  const existing = getResults();
  write(KEYS.results, [...existing, r]);
};
export const getLastResultFor = (quizId: string): QuizResult | null => {
  const all = getResults().filter((r) => r.quizId === quizId);
  return all.length ? all[all.length - 1] : null;
};

// ── Certificates ───────────────────────────────────────────
export const getCertificates = (): Certificate[] => read(KEYS.certificates, []);
export const addCertificate = (c: Certificate): void => {
  const existing = getCertificates();
  // Prevent duplicates
  if (existing.find((x) => x.id === c.id)) return;
  write(KEYS.certificates, [...existing, c]);
};

// ── Export / import (cross-device "sync without backend") ──
export const exportAll = (): string => {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    user: getUser(),
    results: getResults(),
    certificates: getCertificates(),
  };
  return JSON.stringify(payload, null, 2);
};

export const importAll = (json: string): boolean => {
  try {
    const data = JSON.parse(json);
    if (data.user) write(KEYS.user, data.user);
    if (Array.isArray(data.results)) write(KEYS.results, data.results);
    if (Array.isArray(data.certificates)) write(KEYS.certificates, data.certificates);
    return true;
  } catch {
    return false;
  }
};
