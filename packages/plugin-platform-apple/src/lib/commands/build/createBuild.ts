import path from 'node:path';
import { isInteractive, logger, outro, RnefError } from '@rnef/tools';
import type { BuilderCommand, ProjectConfig } from '../../types/index.js';
import { getBuildPaths } from '../../utils/buildPaths.js';
import { getInfo } from '../../utils/getInfo.js';
import { selectFromInteractiveMode } from '../../utils/selectFromInteractiveMode.js';
import type { BuildFlags } from './buildOptions.js';
import { buildProject } from './buildProject.js';
import { exportArchive } from './exportArchive.js';
import { getConfiguration } from './getConfiguration.js';

export const createBuild = async (
  platformName: BuilderCommand['platformName'],
  projectConfig: ProjectConfig,
  args: BuildFlags
) => {
  // TODO: add logic for installing Cocoapods based on @expo/fingerprint & pod-install package.

  const { xcodeProject, sourceDir } = projectConfig;

  if (!xcodeProject) {
    throw new RnefError(
      `Could not find Xcode project files in "${sourceDir}" folder. Please make sure that you have installed Cocoapods and "${sourceDir}" is a valid path`
    );
  }

  validateArgs(args);

  let scheme, mode;
  const info = await getInfo(xcodeProject, sourceDir);

  if (!info) {
    throw new RnefError('Failed to get Xcode project information');
  }

  if (args.interactive) {
    const result = await selectFromInteractiveMode(
      info,
      args.scheme,
      args.mode
    );

    scheme = result.scheme;
    mode = result.mode;
  }

  if (!mode) {
    mode = 'Debug';
  }

  if (args.archive && !mode) {
    logger.debug(
      'Setting build mode to Release, because --archive flag was used'
    );
    mode = 'Release';
  }

  if (!scheme) {
    scheme = path.basename(xcodeProject.name, path.extname(xcodeProject.name));
  }

  await getConfiguration(info, scheme, mode, platformName);

  try {
    await buildProject(
      xcodeProject,
      sourceDir,
      platformName,
      undefined,
      scheme,
      mode,
      args
    );

    if (args.archive) {
      const { archiveDir } = getBuildPaths(platformName);

      const archivePath = path.join(
        archiveDir,
        `${xcodeProject.name.replace('.xcworkspace', '')}.xcarchive`
      );

      await exportArchive({
        sourceDir,
        archivePath,
        scheme,
        mode,
        platformName,
        exportExtraParams: args.exportExtraParams ?? [],
      });
    }
    outro('Success 🎉.');
  } catch (error) {
    throw new RnefError('Failed to create build', { cause: error });
  }
};

function validateArgs(args: BuildFlags) {
  if (args.interactive && !isInteractive()) {
    logger.warn(
      'Interactive mode is not supported in non-interactive environments.'
    );
    args.interactive = false;
  }
}
