import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/packages/plugin-metro',

  test: {
    watch: false,
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/packages/plugin-metro',
      provider: 'v8',
    },
  },
});
