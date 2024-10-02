import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'test-helpers',
    environment: 'node',
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: '../coverage/test-helpers',
    },
    typecheck: {
      tsconfig: './tsconfig.spec.json',
    },
  },
  resolve: {
    extensions: ['.ts', '.js', '.html'],
  },
});
