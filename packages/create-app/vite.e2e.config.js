import { defineConfig } from 'vite';

export default defineConfig({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/packages/create-app',
  test: {
    watch: false,
    globals: true,
    environment: 'node',
    include: ['e2e/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/packages/create-app',
      provider: 'v8',
    },
  },
});
