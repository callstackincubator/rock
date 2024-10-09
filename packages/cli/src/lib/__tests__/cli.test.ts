import { describe, it, expect } from 'vitest';
import { cli } from '../cli.js';

describe('cli', () => {
  it('should throw when config not found', async () => {
    await expect(cli()).rejects.toThrow(
      'rnef.config not found in any parent directory of /'
    );
  });
});
