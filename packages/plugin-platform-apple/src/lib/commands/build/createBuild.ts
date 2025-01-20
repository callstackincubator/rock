import path from 'node:path';
import { isInteractive, logger, outro, RnefError } from '@rnef/tools';
import type {
  BuilderCommand,
  ProjectConfig,
  XcodeProjectInfo,
} from '../../types/index.js';
import { getBuildPaths } from '../../utils/buildPaths.js';
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

  let scheme, mode;

  if (args.interactive) {
    const result = await selectFromInteractiveMode(
      xcodeProject,
      sourceDir,
      args.scheme,
      args.mode
    );

    scheme = result.scheme;
    mode = result.mode;
  }

  normalizeArgs(args, xcodeProject);

  if (!args.interactive) {
    const result = await getConfiguration(
      xcodeProject,
      sourceDir,
      args.scheme,
      args.mode,
      platformName
    );

    scheme = result.scheme;
    mode = result.mode;
  }

  if (!scheme) {
    throw new RnefError(
      'No scheme specified. Please provide a scheme using the --scheme flag or select one in interactive mode'
    );
  }

  if (!mode) {
    throw new RnefError(
      'No mode specified. Please provide a mode using the --mode flag or select one in interactive mode'
    );
  }

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

function normalizeArgs(args: BuildFlags, xcodeProject: XcodeProjectInfo) {
  if (!args.mode) {
    logger.debug('Setting build mode to Debug by default');
    args.mode = 'Debug';
  }
  if (args.archive && !args.mode) {
    logger.debug(
      'Setting build mode to Release, because --archive flag was used'
    );
    args.mode = 'Release';
  }
  if (!args.scheme) {
    args.scheme = path.basename(
      xcodeProject.name,
      path.extname(xcodeProject.name)
    );
  }
  if (args.interactive && !isInteractive()) {
    logger.warn(
      'Interactive mode is not supported in non-interactive environments.'
    );
    args.interactive = false;
  }
}
