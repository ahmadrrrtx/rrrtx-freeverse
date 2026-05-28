// ────────────────────────────────────────────────────────────
// Vercel Edge Function: POST /api/issue-cert
// Commits a new certificate JSON file to the public GitHub registry.
//
// Required env vars in Vercel project settings:
//   GH_REGISTRY_TOKEN  → GitHub Personal Access Token with `contents:write`
//                        scope on the rrrtx-freeverse-certs repo
//
// This is the ONLY server-side piece. Everything else is static.
// Free tier: 500k Edge Function invocations / month — way more than enough.
// ────────────────────────────────────────────────────────────

export const config = { runtime: 'edge' };

const REGISTRY_OWNER = 'ahmadrrrtx';
const REGISTRY_REPO = 'rrrtx-freeverse-certs';
const REGISTRY_BRANCH = 'main';

interface CertPayload {
  id: string;
  recipient: { name: string; email_hash: string };
  quiz: { id: string; title: string; version: string };
  score: number;
  issued_at: string;
  issuer: string;
  verify_url: string;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const token = (globalThis as any).process?.env?.GH_REGISTRY_TOKEN
    ?? (globalThis as any).GH_REGISTRY_TOKEN;
  if (!token) {
    return new Response('Server misconfigured: no GH token', { status: 500 });
  }

  let body: CertPayload;
  try {
    body = (await req.json()) as CertPayload;
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  // ── Basic validation ────────────────────────────────────────
  if (!body.id?.match(/^RFV-\d{4}-[A-F0-9]{8}$/i)) {
    return new Response('Invalid cert ID format', { status: 400 });
  }
  if (typeof body.score !== 'number' || body.score < 0 || body.score > 100) {
    return new Response('Invalid score', { status: 400 });
  }
  if (!body.issued_at || isNaN(Date.parse(body.issued_at))) {
    return new Response('Invalid issued_at', { status: 400 });
  }

  // ── Derive path: certs/YYYY/MM/ID.json ──────────────────────
  const d = new Date(body.issued_at);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const path = `certs/${year}/${month}/${body.id}.json`;

  // ── Commit via GitHub Contents API ──────────────────────────
  const contentB64 = btoa(unescape(encodeURIComponent(JSON.stringify(body, null, 2))));

  const ghRes = await fetch(
    `https://api.github.com/repos/${REGISTRY_OWNER}/${REGISTRY_REPO}/contents/${path}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `feat(cert): issue ${body.id} for ${body.quiz.id}`,
        content: contentB64,
        branch: REGISTRY_BRANCH,
        committer: { name: 'RRRTX FreeVerse Bot', email: 'noreply@rrrtx.dev' },
      }),
    },
  );

  if (!ghRes.ok) {
    const err = await ghRes.text();
    return new Response(`GitHub error: ${err}`, { status: 502 });
  }

  return new Response(
    JSON.stringify({ ok: true, id: body.id, path }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}
