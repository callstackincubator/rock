import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getScheme } from '../getScheme.js';
import { promptForSchemeSelection } from '../prompts.js';

vi.mock('../prompts', () => ({
  promptForSchemeSelection: vi.fn(),
}));

vi.mock('picocolors', () => ({
  default: {
    bold: vi.fn((str) => str),
  },
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
    expect(promptForSchemeSelection).not.toHaveBeenCalled();
  });

  it('should prompt for scheme selection when multiple schemes exist', async () => {
    vi.mocked(promptForSchemeSelection).mockResolvedValueOnce('TestScheme');

    const result = await getScheme(
      ['StageScheme', 'TestScheme'],
      undefined,
      true,
      'ProjectName'
    );

    expect(promptForSchemeSelection).toHaveBeenCalledWith([
      'StageScheme',
      'TestScheme',
    ]);
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
    expect(promptForSchemeSelection).not.toHaveBeenCalled();
  });
});
