import baseConfig from '../../eslint.config.js';
import jsoncParser from 'jsonc-eslint-parser';

export default [
  ...baseConfig,
  {
    files: ['**/*.json'],
    rules: {
      '@nx/dependency-checks': [
        'error',
        {
          ignoredFiles: [
            '{projectRoot}/eslint.config.{js,cjs,mjs}',
            '{projectRoot}/vite.config.{js,ts,mjs,mts}',
          ],
          // TODO: @nx/dependency-checks incorrectly reports unused dependencies
          checkObsoleteDependencies: false,
        },
      ],
    },
    languageOptions: {
      parser: jsoncParser,
    },
  },
  {
    ignores: ['**/template/*'],
  },
];
