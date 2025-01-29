import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getConfiguration } from '../getConfiguration.js';
import { promptForConfigurationSelection } from '../prompts.js';

vi.mock('../prompts', () => ({
  promptForConfigurationSelection: vi.fn(),
}));

vi.mock('picocolors', () => ({
  default: {
    bold: vi.fn((str) => str),
  },
}));

describe('getConfiguration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should return unchanged configuration when info is undefined', async () => {
    const result = await getConfiguration(undefined, 'Debug', true);

    expect(result).toBe('Debug');
    expect(promptForConfigurationSelection).not.toHaveBeenCalled();
  });

  it('should prompt for configuration selection when multiple configurations exist', async () => {
    vi.mocked(promptForConfigurationSelection).mockResolvedValueOnce('Release');

    const result = await getConfiguration(
      ['Debug', 'Release'],
      undefined,
      true
    );

    expect(promptForConfigurationSelection).toHaveBeenCalledWith([
      'Debug',
      'Release',
    ]);
    expect(result).toBe('Release');
  });

  it('should automatically select single configuration', async () => {
    const result = await getConfiguration(['Debug'], undefined, true);

    expect(result).toBe('Debug');
    expect(promptForConfigurationSelection).not.toHaveBeenCalled();
  });
});
