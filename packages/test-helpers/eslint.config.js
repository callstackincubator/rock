import jsoncParser from 'jsonc-eslint-parser';
import baseConfig from '../../eslint.config.js';

export default [
  ...baseConfig,
  {
    files: ['**/*.json'],
    languageOptions: {
      parser: jsoncParser,
    },
  },
];
