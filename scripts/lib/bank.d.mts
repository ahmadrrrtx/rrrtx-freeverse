// Type declarations for the build-time sealing library (scripts/lib/bank.mjs).
// The library is plain ESM JavaScript executed by Node during `bank:build`;
// these signatures exist so the test-suite and scripts can call it from TS.
export const BANK_SCHEMA: string;
export const ANSWER_COMMIT_DOMAIN: string;
export const EXPLANATION_FORMAT: string;
export const DEV_BANK_KEY: string;
export const FINDING_CODES: Record<string, string>;
export const SEVERITY: Record<'HIGH' | 'MEDIUM' | 'LOW', string>;
export function deriveBankKeys(keyMaterial: string): { keyId: string; keys: string[]; answer: string; explanation: string };
export function canonical(value: unknown): string;
export function sha256Hex(input: string | Uint8Array): string;
export function hkdf(keyMaterial: string, info: string, length?: number): string;
export function answerCommit(keys: unknown, questionId: string, optionIndex: number, optionText: string): string;
export function encryptExplanation(keys: unknown, plaintext: string): Record<string, unknown>;
export function sealTopicFile(keys: unknown, fileWithoutSeal: unknown): unknown;
export function learnerRef(keyMaterial: string, email: string): string;
export function lengthExploitability(options: string[], answer: number): Record<string, unknown>;
export function normalizeText(s: string): string;
export function jaccard(a: string, b: string): number;
export function classifyDifficulty(q: unknown): string;
export function analyseItem(topicId: string, q: unknown, index: number): unknown;
export function analyseTopic(topic: unknown): unknown;
export function longestPickAccuracy(items: unknown[]): number;
