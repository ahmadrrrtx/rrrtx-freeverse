// ────────────────────────────────────────────────────────────
// RRRTX FreeVerse — GitHub Certificate Registry (Model B)
// Asynchronously commits issued certificates to a public GitHub repo
// so anyone can verify them later by fetching the raw JSON.
// ────────────────────────────────────────────────────────────
//
// HOW IT WORKS (privacy-preserving, no token leakage):
//   1. Frontend calls /api/issue-cert (Vercel Edge Function)
//   2. Edge Function holds the GitHub PAT as a private env var
//   3. Edge Function commits a new JSON file to the registry repo
//   4. Verify page reads back via raw.githubusercontent.com (no auth needed)
//
// REPO STRUCTURE:
//   github.com/ahmadrrrtx/rrrtx-freeverse-certs
//   └── certs/
//       └── 2026/
//           └── 05/
//               └── RFV-2026-A3F9C2B8.json
// ────────────────────────────────────────────────────────────

import type { Certificate } from '../types';

const REGISTRY_OWNER = 'ahmadrrrtx';
const REGISTRY_REPO = 'rrrtx-freeverse-certs';
const REGISTRY_BRANCH = 'main';

/**
 * Fire-and-forget: push a new cert to the GitHub registry.
 * Failure does NOT block the user — they already have their PDF.
 */
export async function publishToRegistry(cert: Certificate): Promise<boolean> {
  try {
    const res = await fetch('/api/issue-cert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cert),
    });
    return res.ok;
  } catch (e) {
    console.warn('[registry] publish failed (cert still valid via crypto):', e);
    return false;
  }
}

/**
 * Fetch a cert from the public registry. Returns null if not found.
 * Uses raw.githubusercontent.com — no auth needed, no rate limit issues.
 */
export async function fetchFromRegistry(certId: string): Promise<Certificate | null> {
  // Parse year from cert ID: RFV-2026-XXXXXXXX
  const match = certId.match(/^RFV-(\d{4})-[A-F0-9]{8}$/i);
  if (!match) return null;
  const year = match[1];

  // We don't know the month from the ID alone — try all 12.
  // In production you might also encode the month in the ID, or maintain an index file.
  for (let m = 1; m <= 12; m++) {
    const month = String(m).padStart(2, '0');
    const url = `https://raw.githubusercontent.com/${REGISTRY_OWNER}/${REGISTRY_REPO}/${REGISTRY_BRANCH}/certs/${year}/${month}/${certId}.json`;
    try {
      const res = await fetch(url);
      if (res.ok) return (await res.json()) as Certificate;
    } catch {
      /* keep trying */
    }
  }
  return null;
}

/**
 * Optimization: maintain an /index.json file in the registry that maps
 * cert IDs → { year, month } so verification is 1 fetch instead of 12.
 * Implement in v1.1 once you have >100 certs issued.
 */
