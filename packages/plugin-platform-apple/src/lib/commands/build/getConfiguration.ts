import { logger, RnefError } from '@rnef/tools';
import color from 'picocolors';
import type { ApplePlatform, Info } from '../../types/index.js';
import { checkIfConfigurationExists } from '../../utils/checkIfConfigurationExists.js';
import { getPlatformInfo } from './../../utils/getPlatformInfo.js';

export async function getConfiguration(
  info: Info,
  inputScheme: string,
  inputMode: string,
  platformName: ApplePlatform
) {
  checkIfConfigurationExists(info?.configurations ?? [], inputMode);
  let scheme = inputScheme;

  if (!info?.schemes?.includes(scheme)) {
    const { readableName } = getPlatformInfo(platformName);
    const fallbackScheme = `${scheme}-${readableName}`;

    if (info?.schemes?.includes(fallbackScheme)) {
      logger.warn(
        `Scheme "${color.bold(
          scheme
        )}" doesn't exist. Using fallback scheme "${color.bold(
          fallbackScheme
        )}"`
      );

      scheme = fallbackScheme;
    } else {
      throw new RnefError(
        `Scheme "${color.bold(scheme)}" doesn't exist. Please provide a valid scheme.`
      );
    }
  }

  logger.debug(
    `Found Xcode ${
      info.isWorkspace ? 'workspace' : 'project'
    } "${color.bold(info.name)}"`
  );

  return { scheme, mode: inputMode };
}
