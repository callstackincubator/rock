import path from 'node:path';
import {
  color,
  isInteractive,
  logger,
  promptSelect,
  RnefError,
  spinner,
} from '@rnef/tools';
import type {
  ApplePlatform,
  BuilderCommand,
  ProjectConfig,
  XcodeProjectInfo,
} from '../../types/index.js';
import { buildApp } from '../../utils/buildApp.js';
import { getGenericDestination } from '../../utils/destionation.js';
import { getBuildPaths } from '../../utils/getBuildPaths.js';
import type { BuildFlags } from './buildOptions.js';
import { exportArchive } from './exportArchive.js';

export const createBuild = async ({
  platformName,
  projectConfig,
  args,
  projectRoot,
  reactNativePath,
}: {
  platformName: BuilderCommand['platformName'];
  projectConfig: ProjectConfig;
  args: BuildFlags;
  projectRoot: string;
  reactNativePath: string;
}) => {
  console.log('CreateBuild(0) destinations', args.destinations);
  await validateArgs(args);
  console.log('CreateBuild(1) destinations', args.destinations);

  if (args.destinations) {
    args.destinations = args.destinations.map((destination) =>
      resolveDestination(destination, platformName)
    );
    console.log('CreateBuild(2) destinations', args.destinations);
  }

  let xcodeProject: XcodeProjectInfo;
  let sourceDir: string;
  try {
    const { appPath, ...buildAppResult } = await buildApp({
      projectRoot,
      projectConfig,
      platformName,
      args,
      reactNativePath,
    });
    const loader = spinner();
    loader.start('');
    loader.stop(`Build available at: ${color.cyan(appPath)}`);

    xcodeProject = buildAppResult.xcodeProject;
    sourceDir = buildAppResult.sourceDir;
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

    await exportArchive({
      sourceDir,
      archivePath,
      platformName,
      exportExtraParams: args.exportExtraParams ?? [],
      exportOptionsPlist: args.exportOptionsPlist,
    });
  }
};

async function validateArgs(args: BuildFlags) {
  if (!args.destinations) {
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

      args.destinations = [destination];

      logger.info(
        `You can set configuration manually next time using "--destinations ${destination}" flag.`
      );
    } else {
      logger.error(
        `The "--destinations" flag is required in non-interactive environments. Available flag values:
- simulator – suitable for unsigned simulator builds for developers
- device – suitable for signed device builds for testers`
      );
      process.exit(1);
    }
  }
}

function resolveDestination(destination: string, platformName: ApplePlatform) {
  if (destination === 'device') {
    return getGenericDestination(platformName, 'device');
  }

  if (destination === 'simulator') {
    return getGenericDestination(platformName, 'simulator');
  }

  return destination;
}
