// ────────────────────────────────────────────────────────────
// Registry client — the difference between "does not exist" and
// "could not check".
//
// Regression guard for a defect found during the audit: every month
// probe swallowed its error (`.catch(() => null)`), so a network
// failure made a real credential report as `not-found`. A recruiter
// looking at a learner's certificate would have been told it does
// not exist — the single most damaging false statement this system
// can make.
// ────────────────────────────────────────────────────────────

import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadConfig } from '../server/core/config';
import { Registry } from '../server/core/registry';
import { ApiError } from '../server/core/http';

const cfg = { ...loadConfig(), registry: { owner: 'ahmadrrrtx', repo: 'rrrtx-freeverse-certs', branch: 'main' } };

function registry() {
  return new Registry(cfg);
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('registry.readCredential', () => {
  it('returns the record and its real path when a month probe hits', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith('/certs/2026/05/RFV-2026-3BB2D4D5.json')) {
        return jsonResponse({ id: 'RFV-2026-3BB2D4D5', issued_at: '2026-05-01T00:00:00Z' });
      }
      return new Response('not found', { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const found = await registry().readCredential('RFV-2026-3BB2D4D5');
    expect(found?.path).toBe('certs/2026/05/RFV-2026-3BB2D4D5.json');
    expect(found?.record.id).toBe('RFV-2026-3BB2D4D5');
    // Every month was probed in parallel — the id does not encode a month.
    expect(fetchMock).toHaveBeenCalledTimes(13);
  });

  it('returns null only when every probe is a genuine 404', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('not found', { status: 404 })));
    await expect(registry().readCredential('RFV-2026-00000000')).resolves.toBeNull();
  });

  it('reports an unreachable registry as an outage, never as a missing credential', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('ECONNRESET');
    }));

    await expect(registry().readCredential('RFV-2026-3BB2D4D5')).rejects.toMatchObject({
      code: 'registry_unavailable',
      retryable: true,
    });
  });

  it('treats a non-404 HTTP failure as an outage too (e.g. rate limited)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('rate limited', { status: 403 })));

    const err = await registry().readCredential('RFV-2026-3BB2D4D5').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe('registry_unavailable');
  });

  it('still answers once one probe succeeds even if others fail', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith('/certs/2026/10/RFV-2026-A0480625.json')) {
        return jsonResponse({ id: 'RFV-2026-A0480625' });
      }
      // One probe fails while another succeeds: the record still resolves.
      if (url.includes('/certs/2026/01/')) throw new Error('flaky');
      return new Response('not found', { status: 404 });
    }));

    const found = await registry().readCredential('RFV-2026-A0480625');
    expect(found?.record.id).toBe('RFV-2026-A0480625');
  });
});
