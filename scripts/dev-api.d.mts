// Types for scripts/dev-api.mjs — the dev-only Vite plugin that serves the
// real api/*.ts handlers (see vite.config.ts). Kept as a declaration file so
// the plugin can stay plain JavaScript, like scripts/lib/bank.mjs.

import type { Plugin } from 'vite';

export declare function devApi(): Plugin;
