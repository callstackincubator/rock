import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    watch: false,
    globals: true,
    environment: 'node',
    include: [
      'packages/**/src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],
    projects: ['packages/*/vitest.config.ts'],
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
    },
  },
});
