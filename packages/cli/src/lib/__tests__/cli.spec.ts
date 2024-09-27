import { cli } from '../cli';

describe('cli', () => {
  it('should throw when config not found', async () => {
    await expect(cli()).rejects.toThrow('rnef.config not found in any parent directory of /');
  });
});
