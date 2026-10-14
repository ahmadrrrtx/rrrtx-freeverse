import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { devApi } from './scripts/dev-api.mjs';

export default defineConfig(({ command, mode }) => {
  // `npm run dev` runs the real api/*.ts handlers through the dev-api plugin,
  // so the dev process needs the same environment variable *names* as
  // production. Values come from .env.local (gitignored); nothing is bundled.
  const env = command === 'serve' ? loadEnv(mode, process.cwd(), '') : {};
  for (const [key, value] of Object.entries(env)) {
    if ((key.startsWith('FREEVERSE_') || key === 'GH_REGISTRY_TOKEN') && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }

  return {
    plugins: [react(), devApi()],
    build: {
      target: 'es2020',
      sourcemap: false,
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          // Code-split heavy libs so they only load when needed
          manualChunks: {
            'pdf-vendor':    ['jspdf', 'html2canvas'],
            'qr-vendor':     ['qrcode'],
            'motion-vendor': ['framer-motion'],
          },
        },
      },
    },
    server: {
      host: true,
      // Dev server only (this block is ignored by `vite build`): the sandbox
      // preview arrives with the proxy's Host header, which Vite would
      // otherwise reject. Production never serves the dev server.
      allowedHosts: true,
    },
  };
});
