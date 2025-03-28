import path from 'node:path';
import { getProjectConfig } from '@react-native-community/cli-config-apple';
import {
  color,
  isInteractive,
  logger,
  promptSelect,
  RnefError,
  spinner,
} from '@rnef/tools';
import type { BuilderCommand, ProjectConfig } from '../../types/index.js';
import { buildApp } from '../../utils/buildApp.js';
import { getBuildPaths } from '../../utils/getBuildPaths.js';
import {
  getDevicePlatformSDK,
  getSimulatorPlatformSDK,
} from '../../utils/getPlatformInfo.js';
import { installPodsIfNeeded } from '../../utils/pods.js';
import type { BuildFlags } from './buildOptions.js';
import { exportArchive } from './exportArchive.js';

export const createBuild = async (
  platformName: BuilderCommand['platformName'],
  projectConfig: ProjectConfig,
  args: BuildFlags,
  projectRoot: string
) => {
  let { xcodeProject, sourceDir } = projectConfig;

  if (!xcodeProject) {
    throw new RnefError(
      `Could not find Xcode project files in "${sourceDir}" folder. Please make sure that you have installed Cocoapods and "${sourceDir}" is a valid path`
    );
  }

  await validateArgs(args);

  if (args.installPods) {
    await installPodsIfNeeded(
      projectRoot,
      platformName,
      sourceDir,
      args.newArch
    );
    // When the project is not a workspace, we need to get the project config again,
    // because running pods install might have generated .xcworkspace project.
    // This should be only case in new project.
    if (xcodeProject?.isWorkspace === false) {
      const newProjectConfig = getProjectConfig({ platformName })(
        projectRoot,
        {}
      );
      if (newProjectConfig) {
        xcodeProject = newProjectConfig.xcodeProject;
        sourceDir = newProjectConfig.sourceDir;
      }
    }
  }

  if (!xcodeProject) {
    throw new RnefError('Failed to get Xcode project information');
  }

  try {
    const { appPath } = await buildApp({
      xcodeProject,
      sourceDir,
      platformName,
      platformSDK:
        args.destination === 'simulator'
          ? getSimulatorPlatformSDK(platformName)
          : getDevicePlatformSDK(platformName),
      args,
    });
    const loader = spinner();
    loader.start('');
    loader.stop(`Build available at: ${color.cyan(appPath)}`);
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
        platformName,
        exportExtraParams: args.exportExtraParams ?? [],
        exportOptionsPlist: args.exportOptionsPlist,
      });
    } catch (error) {
      throw new RnefError('Failed to export archive', { cause: error });
    }
  }
};

async function validateArgs(args: BuildFlags) {
  if (args.destination && args.destinations) {
    logger.error(
      `Both "--destination" and "--destinations" flags are set. Please pick one.`
    );
    process.exit(1);
  }

  if (!args.destination) {
    if (isInteractive()) {
      const destination = await promptSelect({
        message: 'Select destination for a generic build',
        options: [
          {
            label: 'Simulator',
            value: 'simulator',
          },
          {
            label: 'Device',
            value: 'device',
          },
        ],
      });

      args.destination = destination;

      logger.info(
        `You can set configuration manually next time using "--destination ${destination}" flag.`
      );
    } else {
      logger.error(
        `The "--destination" flag is required in non-interactive environments. Available flag values:
- simulator – suitable for unsigned simulator builds for developers
- device – suitable for signed device builds for testers`
      );
      process.exit(1);
    }
  }
}
