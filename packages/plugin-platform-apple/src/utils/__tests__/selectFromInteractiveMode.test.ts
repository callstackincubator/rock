import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { bold } from 'picocolors';
import { logger } from '@callstack/rnef-tools';
import { selectFromInteractiveMode } from '../selectFromInteractiveMode.js';
import {
  promptForConfigurationSelection,
  promptForSchemeSelection,
} from '../prompts.js';

// Mock dependencies
vi.mock('@callstack/rnef-tools', () => ({
  logger: {
    debug: vi.fn(),
  },
}));

vi.mock('../prompts', () => ({
  promptForConfigurationSelection: vi.fn(),
  promptForSchemeSelection: vi.fn(),
}));

vi.mock('chalk', () => ({
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
    const result = await selectFromInteractiveMode({
      scheme: 'TestScheme',
      mode: 'Debug',
      info: undefined,
    });

    expect(result).toEqual({
      scheme: 'TestScheme',
      mode: 'Debug',
    });
    expect(promptForSchemeSelection).not.toHaveBeenCalled();
    expect(promptForConfigurationSelection).not.toHaveBeenCalled();
  });

  it('should prompt for scheme selection when multiple schemes exist', async () => {
    vi.mocked(promptForSchemeSelection).mockResolvedValueOnce('SelectedScheme');

    const result = await selectFromInteractiveMode({
      scheme: 'TestScheme',
      mode: 'Debug',
      info: {
        schemes: ['Scheme1', 'Scheme2'],
        configurations: ['Debug'],
        name: 'TestApp',
      },
    });

    expect(promptForSchemeSelection).toHaveBeenCalledWith([
      'Scheme1',
      'Scheme2',
    ]);
    expect(result.scheme).toBe('SelectedScheme');
    expect(logger.debug).toHaveBeenCalledWith(
      `Automatically selected ${bold('Debug')} configuration.`
    );
  });

  it('should prompt for configuration selection when multiple configurations exist', async () => {
    vi.mocked(promptForConfigurationSelection).mockResolvedValueOnce('Release');

    const result = await selectFromInteractiveMode({
      scheme: 'TestScheme',
      mode: 'Debug',
      info: {
        schemes: ['TestScheme'],
        configurations: ['Debug', 'Release'],
        name: 'TestApp',
      },
    });

    expect(promptForConfigurationSelection).toHaveBeenCalledWith([
      'Debug',
      'Release',
    ]);
    expect(result.mode).toBe('Release');
    expect(logger.debug).toHaveBeenCalledWith(
      `Automatically selected ${bold('TestScheme')} scheme.`
    );
  });

  it('should automatically select single scheme and configuration', async () => {
    const result = await selectFromInteractiveMode({
      scheme: 'TestScheme',
      mode: 'Debug',
      info: {
        schemes: ['TestScheme'],
        configurations: ['Debug'],
        name: 'TestApp',
      },
    });

    expect(result).toEqual({
      scheme: 'TestScheme',
      mode: 'Debug',
    });
    expect(promptForSchemeSelection).not.toHaveBeenCalled();
    expect(promptForConfigurationSelection).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledTimes(2);
    expect(logger.debug).toHaveBeenNthCalledWith(
      1,
      `Automatically selected ${bold('TestScheme')} scheme.`
    );
    expect(logger.debug).toHaveBeenNthCalledWith(
      2,
      `Automatically selected ${bold('Debug')} configuration.`
    );
  });

  it('should handle undefined scheme and mode', async () => {
    const result = await selectFromInteractiveMode({
      scheme: undefined,
      mode: undefined,
      info: {
        schemes: ['Scheme1', 'Scheme2'],
        configurations: ['Debug', 'Release'],
        name: 'TestApp',
      },
    });

    expect(result).toEqual({
      scheme: undefined,
      mode: undefined,
    });
    expect(promptForSchemeSelection).not.toHaveBeenCalled();
    expect(promptForConfigurationSelection).not.toHaveBeenCalled();
  });
});
