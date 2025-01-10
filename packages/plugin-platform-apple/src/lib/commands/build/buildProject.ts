import { spinner } from '@clack/prompts';
import { handleChildProcessTermination, logger, RnefError } from '@rnef/tools';
import type { SubprocessError } from 'nano-spawn';
import spawn from 'nano-spawn';
import type { ApplePlatform, XcodeProjectInfo } from '../../types/index.js';
import { supportedPlatforms } from '../../utils/supportedPlatforms.js';
import type { BuildFlags } from './buildOptions.js';
import { simulatorDestinationMap } from './simulatorDestinationMap.js';

export const buildProject = async (
  xcodeProject: XcodeProjectInfo,
  sourceDir: string,
  platformName: ApplePlatform,
  udid: string | undefined,
  scheme: string,
  mode: string,
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
    mode,
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
        : mode === 'Debug' || args.device
        ? `generic/platform=${simulatorDest}`
        : `generic/platform=${platformName}` +
          (args.destination ? ',' + args.destination : '');
    })(),
  ];

  if (args.extraParams) {
    xcodebuildArgs.push(...args.extraParams);
  }

  const loader = spinner();
  loader.start(
    `Builing the app with xcodebuild for ${scheme} scheme in ${mode} mode.`
  );
  logger.debug(`Running "xcodebuild ${xcodebuildArgs.join(' ')}.`);
  try {
    const childProcess = spawn('xcodebuild', xcodebuildArgs, {
      cwd: sourceDir,
      stdio: logger.isVerbose() ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    });
    handleChildProcessTermination(childProcess);
    const { output } = await childProcess;
    loader.stop(
      `Built the app with xcodebuild for ${scheme} scheme in ${mode} mode.`
    );
    return output;
  } catch (error) {
    logger.log((error as SubprocessError).stdout);
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
