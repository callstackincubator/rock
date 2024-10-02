import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'create-app',
    environment: 'node',
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: '../../coverage/packages/create-app',
    },
    typecheck: {
      tsconfig: './tsconfig.spec.json',
    },
  },
  resolve: {
    extensions: ['.ts', '.js', '.html'],
  },
});
