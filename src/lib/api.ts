// ────────────────────────────────────────────────────────────
// RRRTX FreeVerse — client API
//
// Thin, typed wrapper around the server-authoritative endpoints.
// Every result shown to a learner comes from here: the browser
// never computes a score, never decides a pass, and never invents
// a credential.
// ────────────────────────────────────────────────────────────

import type {
  ApiErrorBody,
  ApiErrorCode,
  AttemptResult,
  IssueCredentialRequest,
  IssueCredentialResponse,
  StartAttemptRequest,
  StartAttemptResponse,
  SubmitAttemptRequest,
  VerifyResponse,
} from '../types';

export class ClientApiError extends Error {
  readonly code: ApiErrorCode | 'network_error' | 'server_error' | 'unexpected_response';
  readonly status: number;
  readonly retryable: boolean;
  readonly retryAfterSec: number | null;
  readonly details: Record<string, unknown> | null;

  constructor(
    code: ClientApiError['code'],
    message: string,
    opts: { status?: number; retryable?: boolean; retryAfterSec?: number | null; details?: Record<string, unknown> | null } = {},
  ) {
    super(message);
    this.name = 'ClientApiError';
    this.code = code;
    this.status = opts.status ?? 0;
    this.retryable = opts.retryable ?? false;
    this.retryAfterSec = opts.retryAfterSec ?? null;
    this.details = opts.details ?? null;
  }
}

/** Human-facing copy for each server error code. No internal detail leaks. */
export function describeError(error: unknown): string {
  if (error instanceof ClientApiError) {
    if (error.code === 'network_error') return 'We could not reach the assessment server. Check your connection and try again.';
    if (error.code === 'rate_limited') {
      return error.retryAfterSec
        ? `Too many requests. Try again in about ${Math.ceil(error.retryAfterSec / 60)} minute(s).`
        : 'Too many requests. Please wait a moment and try again.';
    }
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(init.headers ?? {}) },
      credentials: 'same-origin',
    });
  } catch {
    throw new ClientApiError('network_error', 'The assessment server is unreachable.', { retryable: true });
  }

  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }

  if (!res.ok) {
    const body = parsed as ApiErrorBody | null;
    const code = body?.error?.code ?? (res.status >= 500 ? 'server_error' : 'unexpected_response');
    const retryAfter = Number(res.headers.get('retry-after') ?? '') || null;
    throw new ClientApiError(code as ClientApiError['code'], body?.error?.message ?? 'The request was rejected.', {
      status: res.status,
      retryable: body?.error?.retryable ?? res.status >= 500,
      retryAfterSec: retryAfter,
      details: body?.error?.details ?? null,
    });
  }

  if (parsed === null) {
    throw new ClientApiError('unexpected_response', 'The server returned an unexpected response.');
  }
  return parsed as T;
}

export const api = {
  startAttempt: (body: StartAttemptRequest) =>
    request<StartAttemptResponse>('/api/attempt', { method: 'POST', body: JSON.stringify(body) }),

  submitAttempt: (body: SubmitAttemptRequest) =>
    request<AttemptResult>('/api/grade', { method: 'POST', body: JSON.stringify(body) }),

  readResult: (resultToken: string) =>
    request<AttemptResult & { reviewUnavailable?: boolean }>('/api/result', {
      method: 'POST',
      body: JSON.stringify({ resultToken }),
    }),

  issueCredential: (body: IssueCredentialRequest) =>
    request<IssueCredentialResponse>('/api/credential', { method: 'POST', body: JSON.stringify(body) }),

  verify: (credentialId: string) =>
    request<VerifyResponse>(`/api/verify?id=${encodeURIComponent(credentialId)}`, { method: 'GET' }),

  health: () =>
    request<{
      ok: boolean;
      environment: string;
      capabilities: { grading: boolean; issuance: boolean; verification: boolean; registryConfigured: boolean };
      bank: { version: string | null; devSealed: boolean | null; topics: number | null; error: string | null };
      notes: string[];
    }>('/api/health', { method: 'GET' }),
};
