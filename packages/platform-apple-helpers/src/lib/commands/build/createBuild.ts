import path from 'node:path';
import { outro } from '@clack/prompts';
import { isInteractive, logger, RnefError } from '@rnef/tools';
import type { BuilderCommand, ProjectConfig } from '../../types/index.js';
import { getBuildPaths } from '../../utils/buildPaths.js';
import { getConfiguration } from '../../utils/getConfiguration.js';
import { getInfo } from '../../utils/getInfo.js';
import { getScheme } from '../../utils/getScheme.js';
import resolvePods from '../../utils/pods/pods.js';
import type { BuildFlags } from './buildOptions.js';
import { buildProject } from './buildProject.js';
import { exportArchive } from './exportArchive.js';

export const createBuild = async (
  platformName: BuilderCommand['platformName'],
  projectConfig: ProjectConfig,
  args: BuildFlags,
  projectRoot: string
) => {
  const resolvedConfig = await resolvePods(
    projectRoot,
    platformName,
    projectConfig
  );

  const { xcodeProject, sourceDir } = resolvedConfig;

  if (!xcodeProject) {
    throw new RnefError(
      `Could not find Xcode project files in "${sourceDir}" folder. Please make sure that you have installed Cocoapods and "${sourceDir}" is a valid path`
    );
  }

  validateArgs(args);

  const info = await getInfo(xcodeProject, sourceDir);

  if (!info) {
    throw new RnefError('Failed to get Xcode project information');
  }

  const scheme = await getScheme(
    info.schemes,
    args.scheme,
    args.interactive,
    xcodeProject.name
  );
  let configuration = await getConfiguration(
    info.configurations,
    args.configuration,
    args.interactive
  );

  if (args.archive && configuration !== 'Release') {
    logger.debug(
      'Setting build configuration to Release, because --archive flag was used'
    );
    configuration = 'Release';
  }

  try {
    await buildProject(
      xcodeProject,
      sourceDir,
      platformName,
      undefined,
      scheme,
      configuration,
      args
    );
  } catch (error) {
    const message = `Failed to create ${args.archive ? 'archive' : 'build'}`;
    throw new RnefError(message, { cause: error });
  }

  if (args.archive) {
    const { archiveDir } = getBuildPaths(platformName);

    const archivePath = path.join(
      archiveDir,
      `${xcodeProject.name.replace('.xcworkspace', '')}.xcarchive`
    );
    try {
      await exportArchive({
        sourceDir,
        archivePath,
        scheme,
        configuration,
        platformName,
        exportExtraParams: args.exportExtraParams ?? [],
      });
    } catch (error) {
      throw new RnefError('Failed to export archive', { cause: error });
    }
  }
  outro('Success 🎉.');
};

function validateArgs(args: BuildFlags) {
  if (args.interactive && !isInteractive()) {
    logger.warn(
      'Interactive mode is not supported in non-interactive environments.'
    );
    args.interactive = false;
  }
}
