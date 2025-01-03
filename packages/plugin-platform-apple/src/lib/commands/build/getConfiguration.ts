import { logger } from '@rnef/tools';
import color from 'picocolors';
import type { ApplePlatform, XcodeProjectInfo } from '../../types/index.js';
import { checkIfConfigurationExists } from '../../utils/checkIfConfigurationExists.js';
import { getInfo } from '../../utils/getInfo.js';
import { getPlatformInfo } from './../../utils/getPlatformInfo.js';

export async function getConfiguration(
  xcodeProject: XcodeProjectInfo,
  sourceDir: string,
  inputScheme: string,
  inputMode: string,
  platformName: ApplePlatform
) {
  const info = await getInfo(xcodeProject, sourceDir);
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
    }
  }

  logger.debug(
    `Found Xcode ${
      xcodeProject.isWorkspace ? 'workspace' : 'project'
    } "${color.bold(xcodeProject.name)}"`
  );

  return { scheme, mode: inputMode };
}
