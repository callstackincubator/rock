import { isInteractive, promptSelect } from '@rnef/tools';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getConfiguration } from '../getConfiguration.js';

vi.mock('../prompts', () => ({
  promptSelect: vi.fn(),
}));

describe('getConfiguration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should return unchanged configuration when info is undefined', async () => {
    vi.mocked(isInteractive).mockReturnValue(true);
    const result = await getConfiguration(undefined, 'Debug');

    expect(result).toBe('Debug');
    expect(promptSelect).not.toHaveBeenCalled();
  });

  it('should prompt for configuration selection when multiple configurations exist', async () => {
    vi.mocked(isInteractive).mockReturnValue(true);
    vi.mocked(promptSelect).mockResolvedValueOnce('Release');

    const result = await getConfiguration(
      ['Debug', 'Release', 'Internal'],
      undefined,
    );

    expect(promptSelect).toHaveBeenCalledWith({
      message: 'Select the configuration you want to use',
      options: [
        { label: 'Debug', value: 'Debug' },
        { label: 'Release', value: 'Release' },
        { label: 'Internal', value: 'Internal' },
      ],
    });
    expect(result).toBe('Release');
  });

  it('should not prompt for configuration selection when only Debug and Release configurations exist', async () => {
    vi.mocked(isInteractive).mockReturnValue(true);
    vi.mocked(promptSelect).mockResolvedValueOnce('Release');

    const result = await getConfiguration(['Debug', 'Release'], undefined);

    expect(promptSelect).not.toHaveBeenCalled();
    expect(result).toBe('Debug');
  });

  it('should automatically select single configuration', async () => {
    vi.mocked(isInteractive).mockReturnValue(true);
    const result = await getConfiguration(['Debug'], undefined);

    expect(result).toBe('Debug');
    expect(promptSelect).not.toHaveBeenCalled();
  });
});
