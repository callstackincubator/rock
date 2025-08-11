import { expect, test } from 'vitest';
import { parseArgs } from '../parse-args.js';

test('parseArgs', () => {
  const args = parseArgs(
    `-aaaa CODE_SIGNING="iPhone Distribution" TEST='AAA BBB'`,
  );
  expect(args).toMatchInlineSnapshot(`
    [
      "-aaaa",
      "CODE_SIGNING="iPhone Distribution"",
      "TEST='AAA BBB'",
    ]
  `);
});
