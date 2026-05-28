import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
});
