import * as fs from 'node:fs';
import * as path from 'node:path';
import { expect, test } from 'vitest';
import { cleanup, getTempDirectory, writeFiles } from './test-helpers';

test('writeFiles in temp directory with cleanup', () => {
  const directory = getTempDirectory('test_helpers');
  const files = {
    'package.json': '{}',
    'dir/file.js': 'module.exports = "x";',
  };

  writeFiles(directory, files);

  expect(fs.readFileSync(path.join(directory, 'package.json'), 'utf8')).toBe(
    '{}'
  );
  expect(fs.readFileSync(path.join(directory, 'dir', 'file.js'), 'utf8')).toBe(
    'module.exports = "x";'
  );

  cleanup(directory);

  expect(fs.existsSync(directory)).toBe(false);
});
