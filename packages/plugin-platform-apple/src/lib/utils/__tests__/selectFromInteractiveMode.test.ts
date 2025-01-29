import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  promptForConfigurationSelection,
  promptForSchemeSelection,
} from '../prompts.js';
import { selectFromInteractiveMode } from '../selectFromInteractiveMode.js';

vi.mock('../prompts', () => ({
  promptForConfigurationSelection: vi.fn(),
  promptForSchemeSelection: vi.fn(),
}));

vi.mock('picocolors', () => ({
  default: {
    bold: vi.fn((str) => str),
  },
}));

describe('selectFromInteractiveMode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should return unchanged values when info is undefined', async () => {
    const xcodeInfo = {
      name: 'TestApp',
      path: '/path/to/TestApp',
      isWorkspace: true,
    };
    
    const result = await selectFromInteractiveMode(
      xcodeInfo,
      'TestScheme',
      'Debug'
    );

    expect(result).toEqual({
      scheme: 'TestScheme',
      mode: 'Debug',
    });
    expect(promptForSchemeSelection).not.toHaveBeenCalled();
    expect(promptForConfigurationSelection).not.toHaveBeenCalled();
  });

  it('should prompt for scheme selection when multiple schemes exist', async () => {
    vi.mocked(promptForSchemeSelection).mockResolvedValueOnce('SelectedScheme');

    const xcodeInfo = {
      schemes: ['Scheme1', 'Scheme2'],
      configurations: ['Debug'],
      name: 'TestApp',
      isWorkspace: true,
    };

    const result = await selectFromInteractiveMode(
      xcodeInfo,
    );

    expect(promptForSchemeSelection).toHaveBeenCalledWith([
      'Scheme1',
      'Scheme2',
    ]);
    expect(result.scheme).toBe('SelectedScheme');
  });

  it('should prompt for configuration selection when multiple configurations exist', async () => {
    vi.mocked(promptForConfigurationSelection).mockResolvedValueOnce('Release');

    const xcodeInfo = {
      schemes: ['TestScheme'],
      configurations: ['Debug', 'Release'],
      name: 'TestApp',
      isWorkspace: true
    };

    const result = await selectFromInteractiveMode(
      xcodeInfo,
    );

    expect(promptForConfigurationSelection).toHaveBeenCalledWith([
      'Debug',
      'Release',
    ]);
    expect(result.mode).toBe('Release');
  });

  it('should automatically select single scheme and configuration', async () => {
    const xcodeInfo = {
      schemes: ['TestScheme'],
      configurations: ['Debug'],
      name: 'TestApp',
      isWorkspace: true,
    };
    
    const result = await selectFromInteractiveMode(
      xcodeInfo,
      'TestScheme',
      'Debug'
    );

    expect(result).toEqual({
      scheme: 'TestScheme',
      mode: 'Debug',
    });
    expect(promptForSchemeSelection).not.toHaveBeenCalled();
    expect(promptForConfigurationSelection).not.toHaveBeenCalled();
  });
});
