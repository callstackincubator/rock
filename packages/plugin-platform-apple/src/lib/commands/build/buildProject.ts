import path from 'node:path';
import type { SubprocessError } from '@rnef/tools';
import { logger, RnefError, spawn, spinner } from '@rnef/tools';
import type { ApplePlatform, XcodeProjectInfo } from '../../types/index.js';
import { getBuildPaths } from '../../utils/buildPaths.js';
import { supportedPlatforms } from '../../utils/supportedPlatforms.js';
import type { BuildFlags } from './buildOptions.js';
import { simulatorDestinationMap } from './simulatorDestinationMap.js';

export const buildProject = async (
  xcodeProject: XcodeProjectInfo,
  sourceDir: string,
  platformName: ApplePlatform,
  udid: string | undefined,
  scheme: string,
  configuration: string,
  args: BuildFlags
) => {
  const simulatorDest = simulatorDestinationMap[platformName];

  if (!simulatorDest) {
    throw new Error(
      `Unknown platform: ${platformName}. Please, use one of: ${Object.values(
        supportedPlatforms
      ).join(', ')}.`
    );
  }

  const xcodebuildArgs = [
    xcodeProject.isWorkspace ? '-workspace' : '-project',
    xcodeProject.name,
    ...(args.buildFolder ? ['-derivedDataPath', args.buildFolder] : []),
    '-configuration',
    configuration,
    '-scheme',
    scheme,
    '-destination',
    (() => {
      if (args.device && typeof args.device === 'string') {
        // Check if the device argument looks like a UDID (assuming UDIDs are alphanumeric and have specific length)
        const isUDID = /^[A-Fa-f0-9-]{25,}$/.test(args.device);
        if (isUDID) {
          return `id=${args.device}`;
        } else {
          // If it's a device name
          return `name=${args.device}`;
        }
      }

      return args.catalyst
        ? 'platform=macOS,variant=Mac Catalyst'
        : udid
        ? `id=${udid}`
        : configuration === 'Debug' || args.device
        ? `generic/platform=${simulatorDest}`
        : `generic/platform=${platformName}` +
          (args.destination ? ',' + args.destination : '');
    })(),
  ];

  if (args.archive) {
    const { archiveDir } = getBuildPaths(platformName);
    const archiveName = `${xcodeProject.name.replace(
      '.xcworkspace',
      ''
    )}.xcarchive`;

    xcodebuildArgs.push(
      '-archivePath',
      path.join(archiveDir, archiveName),
      'archive'
    );
  }

  if (args.extraParams) {
    xcodebuildArgs.push(...args.extraParams);
  }

  const loader = spinner();
  const message = `${
    args.archive ? 'Archiving' : 'Building'
  } the app with xcodebuild for ${scheme} scheme in ${configuration} configuration`;

  loader.start(message, { kind: 'clock' });
  logger.debug(`Running "xcodebuild ${xcodebuildArgs.join(' ')}.`);
  try {
    const { output } = await spawn('xcodebuild', xcodebuildArgs, {
      cwd: sourceDir,
      stdio: logger.isVerbose() ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    });
    loader.stop(
      `${
        args.archive ? 'Archived' : 'Built'
      } the app with xcodebuild for ${scheme} scheme in ${configuration} configuration.`
    );
    return output;
  } catch (error) {
    logger.error((error as SubprocessError).stderr);
    loader.stop(
      'Running xcodebuild failed. Check the error message above for details.',
      1
    );

    if (!xcodeProject.isWorkspace) {
      throw new RnefError(
        `If your project uses CocoaPods, make sure to install pods with "pod install" in ${sourceDir} directory.`,
        { cause: error }
      );
    }

    throw new RnefError('Running xcodebuild failed', { cause: error });
  }
};
