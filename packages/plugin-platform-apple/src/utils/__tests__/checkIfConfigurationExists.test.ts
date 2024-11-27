import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkIfConfigurationExists } from '../checkIfConfigurationExists.js';
import { logger } from '@callstack/rnef-tools';

const CONFIGURATIONS = ['Debug', 'Release'];
const NON_EXISTING_CONFIG = 'Test';

describe('checkIfConfigurationExists', () => {
  beforeEach(() => {
    // Mock process.exit
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    // Mock logger methods
    vi.spyOn(logger, 'error').mockImplementation(() => vi.fn());
    vi.spyOn(logger, 'warn').mockImplementation(() => vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('should throw an error if project info does not contain selected configuration', () => {
    checkIfConfigurationExists(CONFIGURATIONS, NON_EXISTING_CONFIG);

    expect(logger.error).toHaveBeenCalledWith(
      `Configuration "${NON_EXISTING_CONFIG}" does not exist in your project. Please use one of the existing configurations: ${CONFIGURATIONS.join(
        ', '
      )}`
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  test('should not throw an error if project info contains selected configuration', () => {
    checkIfConfigurationExists(CONFIGURATIONS, 'Debug');

    expect(process.exit).not.toHaveBeenCalled();
  });

  test('should not throw an error if project could not be found', () => {
    checkIfConfigurationExists([], 'Debug');

    expect(logger.warn).toHaveBeenCalledWith(
      'Unable to check whether "Debug" exists in your project'
    );
    expect(process.exit).not.toHaveBeenCalled();
  });
});
