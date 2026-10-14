// ────────────────────────────────────────────────────────────
// RRRTX FreeVerse — HTTP helpers shared by every API route
//
// Design rules (see SECURITY_AUDIT.md §P1-D and §P2-C):
//   • Never return a stack trace, driver error, file path or env
//     name to the client. Errors are mapped to a small enum.
//   • Never echo request bodies back on error.
//   • Same-origin enforcement: state-changing routes reject
//     cross-site requests (Sec-Fetch-Site / Origin).
//   • All responses are non-cacheable by default.
// ────────────────────────────────────────────────────────────

import { loadConfig, type ServerConfig } from './config';
import type { ApiErrorBody, ApiErrorCode } from '../../shared/contracts';

const NO_STORE = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
} as const;

/**
 * Public read-only endpoints (`/api/catalog`, `/api/verify`, `/api/health`) are
 * meant to be consumed by other applications in the family (LearnPath, a
 * recruiter's dashboard, a script). They expose no personal data and no
 * secrets, so they are readable cross-origin. State-changing routes are not,
 * and never get these headers.
 */
export const PUBLIC_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
} as const;

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Answer a CORS preflight for the public read-only routes. Null if not a preflight. */
export function preflight(req: Request): Response | null {
  if (req.method !== 'OPTIONS') return null;
  return new Response(null, { status: 204, headers: { ...PUBLIC_CORS, 'Cache-Control': 'no-store' } });
}

export function jsonResponse(body: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...NO_STORE, ...extraHeaders },
  });
}

const STATUS_FOR: Record<ApiErrorCode, number> = {
  bad_request: 400,
  invalid_attempt: 400,
  attempt_expired: 410,
  attempt_already_used: 409,
  invalid_result: 400,
  not_passed: 403,
  prerequisite_missing: 403,
  cooldown_active: 429,
  rate_limited: 429,
  origin_rejected: 403,
  engine_unavailable: 503,
  registry_unavailable: 503,
  conflict: 409,
  not_implemented: 501,
  internal_error: 500,
};

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly retryable: boolean;
  readonly details?: Record<string, unknown>;
  readonly headers?: Record<string, string>;

  constructor(code: ApiErrorCode, message: string, opts: { retryable?: boolean; details?: Record<string, unknown>; headers?: Record<string, string> } = {}) {
    super(message);
    this.code = code;
    this.retryable = opts.retryable ?? false;
    this.details = opts.details;
    this.headers = opts.headers;
  }

  toResponse(): Response {
    const body: ApiErrorBody = {
      error: { code: this.code, message: this.message, retryable: this.retryable, ...(this.details ? { details: this.details } : {}) },
    };
    return jsonResponse(body, STATUS_FOR[this.code] ?? 500, this.headers ?? {});
  }
}

/**
 * Server-side diagnostic log. Never pass tokens, keys, emails or
 * recipient names into this function — log identifiers, not data.
 */
export function logEvent(event: string, fields: Record<string, string | number | boolean | null | undefined> = {}): void {
  const parts = Object.entries(fields)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}=${String(v).replace(/[\n\r]/g, ' ').slice(0, 120)}`);
  console.error(`[freeverse:${event}] ${parts.join(' ')}`);
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

function hostOf(req: Request): string | null {
  return req.headers.get('x-forwarded-host') ?? req.headers.get('host');
}

/**
 * CSRF / cross-site abuse guard.
 * The API is cookie-less, so classic CSRF does not apply; what does apply is
 * "any website can make a logged-out visitor's browser mint attempts and
 * credentials". We therefore require same-origin for state-changing calls.
 */
export function assertSameOrigin(req: Request, cfg: ServerConfig = loadConfig()): void {
  // Read-only routes are deliberately open to other origins (see PUBLIC_CORS):
  // there is nothing to forge in a GET, and a recruiter's dashboard or LearnPath
  // must be able to check a credential without a server-side proxy.
  if (SAFE_METHODS.has(req.method)) return;

  const site = req.headers.get('sec-fetch-site');
  const origin = req.headers.get('origin');
  const host = hostOf(req);

  if (site && site === 'cross-site') {
    throw new ApiError('origin_rejected', 'Cross-site requests are not accepted by this endpoint.');
  }
  if (!origin) return; // non-browser client (curl, tests, server-to-server)

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new ApiError('origin_rejected', 'Unparseable Origin header.');
  }
  const sameAsRequest = host ? originHost === host : false;
  const allowlisted = cfg.allowedOrigins.some((o) => {
    try {
      return new URL(o).host === originHost;
    } catch {
      return false;
    }
  });
  if (!sameAsRequest && !allowlisted) {
    throw new ApiError('origin_rejected', 'This origin is not allowed to call the API.');
  }
}

export async function readJsonBody<T>(req: Request, maxBytes = loadConfig().maxBodyBytes): Promise<T> {
  const contentType = req.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new ApiError('bad_request', 'Expected Content-Type: application/json.');
  }
  const declared = Number(req.headers.get('content-length') ?? '0');
  if (declared && declared > maxBytes) {
    throw new ApiError('bad_request', 'Request body too large.');
  }
  let text: string;
  try {
    text = await req.text();
  } catch {
    throw new ApiError('bad_request', 'Could not read request body.');
  }
  if (text.length > maxBytes) throw new ApiError('bad_request', 'Request body too large.');
  if (!text) throw new ApiError('bad_request', 'Request body is empty.');
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError('bad_request', 'Request body is not valid JSON.');
  }
}

export function requireMethod(req: Request, ...allowed: string[]): void {
  if (!allowed.includes(req.method)) {
    throw new ApiError('bad_request', `Method ${req.method} not allowed.`);
  }
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Trim, strip control characters and cap length. Rejects non-strings. */
export function sanitizeText(value: unknown, opts: { min: number; max: number; field: string }): string {
  if (typeof value !== 'string') throw new ApiError('bad_request', `${opts.field} must be a string.`);
  // eslint-disable-next-line no-control-regex
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  if (cleaned.length < opts.min) throw new ApiError('bad_request', `${opts.field} is too short.`);
  if (cleaned.length > opts.max) throw new ApiError('bad_request', `${opts.field} is too long (max ${opts.max}).`);
  return cleaned;
}

export function sanitizeEmail(value: unknown): string {
  const email = sanitizeText(value, { min: 5, max: 254, field: 'email' }).toLowerCase();
  // Intentionally permissive but anchored: one @, no whitespace, a dot in the domain.
  if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email)) throw new ApiError('bad_request', 'That does not look like an email address.');
  return email;
}

export type RouteHandler = (req: Request) => Promise<Response> | Response;

/**
 * Wrap a route so it works with both calling conventions:
 *   • Web style  — `export default async (req: Request) => Response` (tests, edge)
 *   • Node style — `(req: IncomingMessage, res: ServerResponse)` (Vercel Node runtime)
 * Errors are mapped centrally; nothing internal leaks to the client.
 */
export interface NodeResponseLike {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(body?: Uint8Array | string): void;
}

export interface NodeRequestLike extends AsyncIterable<Uint8Array | string> {
  method?: string;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
}

export function defineRoute(handler: RouteHandler) {
  return async function route(req: Request | NodeRequestLike, res?: NodeResponseLike): Promise<Response | void> {
    // ── Web API call signature ──
    if (typeof Request !== 'undefined' && req instanceof Request) {
      return safeInvoke(handler, req);
    }

    // ── Node call signature (Vercel Node runtime) ──
    if (!res) {
      return new ApiError('internal_error', 'The server could not complete this request.').toResponse();
    }
    const request = await nodeRequestToWebRequest(req as NodeRequestLike);
    const response = await safeInvoke(handler, request);

    res.statusCode = response.status;
    response.headers.forEach((value: string, key: string) => res.setHeader(key, value));
    const body = Buffer.from(await response.arrayBuffer());
    res.end(body);
    return undefined;
  };
}

async function safeInvoke(handler: RouteHandler, req: Request): Promise<Response> {
  try {
    return await handler(req);
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.code === 'internal_error' || err.code === 'engine_unavailable') {
        logEvent('api_error', { code: err.code, message: err.message });
      }
      return err.toResponse();
    }
    // Unknown failure: log a class name only, return an opaque error.
    logEvent('unhandled_error', { name: err instanceof Error ? err.name : typeof err });
    return new ApiError('internal_error', 'The server could not complete this request.').toResponse();
  }
}

async function nodeRequestToWebRequest(req: NodeRequestLike): Promise<Request> {
  const proto = req.headers?.['x-forwarded-proto'] ?? 'https';
  const host = req.headers?.host ?? 'localhost';
  const url = `${proto}://${host}${req.url ?? '/'}`;

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers ?? {})) {
    if (typeof value === 'string') headers.set(key, value);
    else if (Array.isArray(value)) headers.set(key, value.join(', '));
  }

  let body: Buffer | undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of req) {
      const buf = Buffer.from(chunk);
      size += buf.length;
      if (size > loadConfig().maxBodyBytes) break;
      chunks.push(buf);
    }
    if (chunks.length) body = Buffer.concat(chunks);
  }

  return new Request(url, {
    method: req.method,
    headers,
    body: body ? new Uint8Array(body) : undefined,
  });
}
