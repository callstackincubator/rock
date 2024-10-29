import { BuildFlags } from './buildOptions.js';
import { buildProject } from './buildProject.js';
import { getXcodeProjectAndDir } from './getXcodeProjectAndDir.js';
import { supportedPlatforms } from '../../config/supportedPlatforms.js';
import { BuilderCommand } from '../../types/index.js';
import CLIError from '../../utils/error.js';
import getPlatformConfig from '../../utils/getPlatformConfig.js';

export const createBuild = async (
  platformName: BuilderCommand['platformName'],
  buildFlags: BuildFlags
) => {
  const platformConfig = getPlatformConfig(platformName);

  if (!platformConfig) {
    throw new CLIError(`Unable to find ${platformName} platform config.`);
  }

  if (
    platformConfig === undefined ||
    supportedPlatforms[platformName] === undefined
  ) {
    throw new CLIError(`Unable to find ${platformName} platform config`);
  }

  // TODO: add logic for installing Cocoapods
  // if there's no `.xcoworpsace` file, we need to log it and probably exit

  const { xcodeProject, sourceDir } = getXcodeProjectAndDir(
    platformConfig,
    platformName
  );

  process.chdir(sourceDir);

  return buildProject(xcodeProject, platformName, undefined, buildFlags);
};
