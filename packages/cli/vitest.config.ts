import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths({ ignoreConfigErrors: true })],
  test: {
    name: 'cli',
    environment: 'node',
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: '../../coverage/packages/cli',
    },
    typecheck: {
      tsconfig: './tsconfig.spec.json',
    },
  },
  resolve: {
    extensions: ['.ts', '.js', '.html'],
  },
});
