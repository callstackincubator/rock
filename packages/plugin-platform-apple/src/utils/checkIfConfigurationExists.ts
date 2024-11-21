import { logger } from '@callstack/rnef-tools';

export function checkIfConfigurationExists(
  configurations: string[],
  mode: string
) {
  if (configurations.length === 0) {
    logger.warn(`Unable to check whether "${mode}" exists in your project`);
    return;
  }

  if (!configurations.includes(mode)) {
    throw new Error(
      `Configuration "${mode}" does not exist in your project. Please use one of the existing configurations: ${configurations.join(
        ', '
      )}`
    );
  }
}
