// ────────────────────────────────────────────────────────────
// POST /api/issue-cert — REMOVED (returns 410 Gone)
//
// This endpoint previously accepted a fully client-authored
// certificate record and committed it to the public registry. That
// made every field forgeable: a caller could POST any name, quiz,
// score and id and receive a permanent, publicly verifiable
// credential (see SECURITY_AUDIT.md §P0-A / §P0-B). The signing
// salt was also public, so ids could be generated offline.
//
// It is kept as an explicit tombstone rather than deleted so that:
//   • clients that still hold an old bundle receive a clear answer
//     instead of a confusing 404,
//   • any credential already in the registry stays verifiable.
//
// The replacement is POST /api/credential, which requires a signed
// result token that the server only mints after grading a passing
// attempt.
// ────────────────────────────────────────────────────────────

import { defineRoute, jsonResponse } from '../server/core/http';
import type { ApiErrorBody } from '../shared/contracts';

export default defineRoute(async () => {
  const body: ApiErrorBody = {
    error: {
      code: 'not_implemented',
      message:
        'This endpoint was removed: credentials can no longer be authored by the client. Finish an assessment and the server will issue the credential automatically (POST /api/credential with a signed result token).',
      retryable: false,
    },
  };
  return jsonResponse(body, 410);
});
