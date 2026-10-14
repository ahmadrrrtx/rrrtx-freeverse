// ────────────────────────────────────────────────────────────
// Dev-only Vite plugin — serves the real `api/*.ts` handlers.
//
// Why: the serverless routes are the security boundary of this app
// (selection, grading, issuance, verification). `vite dev` alone would
// show a UI that cannot talk to them, so the lifecycle could only be
// checked after a deploy. This plugin loads the *actual* handlers with
// Vite's SSR transform and bridges Node's request objects to the Web
// `Request`/`Response` pair they already speak.
//
// It is `apply: 'serve'`: it is never part of a production build, and it
// never sees a secret value — configuration comes from the process
// environment exactly as it does in production.
// ────────────────────────────────────────────────────────────

/** Bridge a Node IncomingMessage into a Web Request. */
async function toWebRequest(req) {
  const host = req.headers.host ?? 'localhost';
  const proto = req.headers['x-forwarded-proto'] ?? 'http';
  const url = new URL(req.url ?? '/', `${proto}://${host}`);

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (key === 'connection' || key === 'transfer-encoding' || key === 'content-length') continue;
    if (typeof value === 'string') headers.set(key, value);
    else if (Array.isArray(value)) for (const v of value) headers.append(key, v);
  }

  let body;
  if (req.method && req.method !== 'GET' && req.method !== 'HEAD') {
    const chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    if (chunks.length > 0) body = new Uint8Array(Buffer.concat(chunks));
  }

  return new Request(url, { method: req.method ?? 'GET', headers, body });
}

export function devApi() {
  return {
    name: 'freeverse-dev-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? '/';
        if (!url.startsWith('/api/')) return next();

        const route = url.slice('/api/'.length).split('?')[0].replace(/[^A-Za-z0-9_-]/g, '');
        if (!route) {
          res.statusCode = 404;
          return res.end('Not found');
        }

        try {
          const mod = await server.ssrLoadModule(`/api/${route}.ts`);
          const handler = mod.default;
          if (typeof handler !== 'function') {
            res.statusCode = 404;
            return res.end('Not found');
          }
          const response = await handler(await toWebRequest(req));
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (err) {
          // Only the class of failure — never a stack or a config value.
          server.config.logger.error(`[dev-api] ${route} failed: ${err?.name ?? typeof err}`);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: { code: 'internal_error', message: 'Dev API bridge failed.', retryable: false } }));
        }
      });
    },
  };
}
