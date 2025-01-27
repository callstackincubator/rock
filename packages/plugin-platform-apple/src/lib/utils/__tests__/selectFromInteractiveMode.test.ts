import * as tools from '@rnef/tools';
import color from 'picocolors';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getInfo } from '../getInfo.js';
import {
  promptForConfigurationSelection,
  promptForSchemeSelection,
} from '../prompts.js';
import { selectFromInteractiveMode } from '../selectFromInteractiveMode.js';

vi.mock('../getInfo', () => {
  return {
    getInfo: vi.fn(() => Promise.resolve(undefined)),
  };
});

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
      '/path/to/TestApp/ios',
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
    vi.mocked(getInfo).mockResolvedValueOnce({
      schemes: ['Scheme1', 'Scheme2'],
      configurations: ['Debug'],
      name: 'TestApp',
    });
    const xcodeInfo = {
      name: 'TestApp',
      path: '/path/to/TestApp',
      isWorkspace: true,
    };
    const result = await selectFromInteractiveMode(
      xcodeInfo,
      '/path/to/TestApp/ios',
      'TestScheme',
      'Debug'
    );

    expect(promptForSchemeSelection).toHaveBeenCalledWith([
      'Scheme1',
      'Scheme2',
    ]);
    expect(result.scheme).toBe('SelectedScheme');
    expect(tools.logger.debug).toHaveBeenCalledWith(
      `Automatically selected ${color.bold('Debug')} configuration.`
    );
  });

  it('should prompt for configuration selection when multiple configurations exist', async () => {
    vi.mocked(promptForConfigurationSelection).mockResolvedValueOnce('Release');
    vi.mocked(getInfo).mockResolvedValueOnce({
      schemes: ['TestScheme'],
      configurations: ['Debug', 'Release'],
      name: 'TestApp',
    });
    const xcodeInfo = {
      name: 'TestApp',
      path: '/path/to/TestApp',
      isWorkspace: true,
    };
    const result = await selectFromInteractiveMode(
      xcodeInfo,
      '/path/to/TestApp/ios',
      'TestScheme',
      'Debug'
    );

    expect(promptForConfigurationSelection).toHaveBeenCalledWith([
      'Debug',
      'Release',
    ]);
    expect(result.mode).toBe('Release');
    expect(tools.logger.debug).toHaveBeenCalledWith(
      `Automatically selected ${color.bold('TestScheme')} scheme.`
    );
  });

  it('should automatically select single scheme and configuration', async () => {
    vi.mocked(getInfo).mockResolvedValueOnce({
      schemes: ['TestScheme'],
      configurations: ['Debug'],
      name: 'TestApp',
    });
    const xcodeInfo = {
      name: 'TestApp',
      path: '/path/to/TestApp',
      isWorkspace: true,
    };
    const result = await selectFromInteractiveMode(
      xcodeInfo,
      '/path/to/TestApp/ios',
      'TestScheme',
      'Debug'
    );

    expect(result).toEqual({
      scheme: 'TestScheme',
      mode: 'Debug',
    });
    expect(promptForSchemeSelection).not.toHaveBeenCalled();
    expect(promptForConfigurationSelection).not.toHaveBeenCalled();
    expect(tools.logger.debug).toHaveBeenCalledTimes(2);
    expect(tools.logger.debug).toHaveBeenNthCalledWith(
      1,
      `Automatically selected ${color.bold('TestScheme')} scheme.`
    );
    expect(tools.logger.debug).toHaveBeenNthCalledWith(
      2,
      `Automatically selected ${color.bold('Debug')} configuration.`
    );
  });
});
