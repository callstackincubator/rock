import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect,it } from 'vitest';
import { cli } from '../cli.js';

it('should throw when config not found', async () => {
  await expect(cli({})).rejects.toThrow(
    'rnef.config not found in any parent directory of /'
  );
});

it('should not throw when config is there', async () => {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  await cli({
    cwd: join(__dirname, '__fixtures__/simple-config'),
    argv: ['node', 'rnef', 'test'],
  });
});
