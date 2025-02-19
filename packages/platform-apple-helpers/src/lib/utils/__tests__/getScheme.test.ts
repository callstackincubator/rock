import { promptSelect } from '@rnef/tools';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getScheme } from '../getScheme.js';

vi.mock('../prompts', () => ({
  promptForSchemeSelection: vi.fn(),
}));

describe('getScheme', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should return unchanged scheme when info is undefined', async () => {
    const result = await getScheme(
      undefined,
      'TestScheme',
      true,
      'ProjectName'
    );

    expect(result).toBe('TestScheme');
    expect(promptSelect).not.toHaveBeenCalled();
  });

  it('should prompt for scheme selection when multiple schemes exist', async () => {
    vi.mocked(promptSelect).mockResolvedValueOnce('TestScheme');

    const result = await getScheme(
      ['StageScheme', 'TestScheme'],
      undefined,
      true,
      'ProjectName'
    );

    expect(promptSelect).toHaveBeenCalledWith({
      message: 'Select the scheme you want to use',
      options: [
        { label: 'StageScheme', value: 'StageScheme' },
        { label: 'TestScheme', value: 'TestScheme' },
      ],
    });
    expect(result).toBe('TestScheme');
  });

  it('should automatically select single scheme', async () => {
    const result = await getScheme(
      ['ProjectName'],
      undefined,
      true,
      'ProjectName'
    );

    expect(result).toBe('ProjectName');
    expect(promptSelect).not.toHaveBeenCalled();
  });
});
