import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Security tests mutate shared module state (context, rate-limit buckets),
    // so each file runs in its own worker.
    isolate: true,
    testTimeout: 20000,
  },
});
