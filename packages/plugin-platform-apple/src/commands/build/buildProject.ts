import child_process, { SpawnOptionsWithoutStdio } from 'child_process';
import color from 'picocolors';
import type { BuildFlags } from './buildOptions.js';
import { supportedPlatforms } from '../../supportedPlatforms.js';
import { ApplePlatform, XcodeProjectInfo } from '../../types/index.js';
import { logger } from '@callstack/rnef-tools';
import { getConfiguration } from './getConfiguration.js';
import { simulatorDestinationMap } from './simulatorDestinationMap.js';
import { spinner } from '@clack/prompts';
import { getPlatformInfo } from '../../utils/getPlatformInfo.js';

function prettifyXcodebuildMessages(output: string): Set<string> {
  const errorRegex = /error\b[^\S\r\n]*[:\-\s]*([^\r\n]*)/gim;
  const errors = new Set<string>();

  let match;
  while ((match = errorRegex.exec(output)) !== null) {
    if (match[1]) {
      // match[1] contains the captured group that excludes any leading colons or spaces
      errors.add(match[1].trim());
    }
  }

  return errors;
}

const buildProject = async (
  xcodeProject: XcodeProjectInfo,
  platformName: ApplePlatform,
  udid: string | undefined,
  args: BuildFlags
): Promise<string> => {
  const simulatorDest = simulatorDestinationMap[platformName];

  if (!simulatorDest) {
    throw new Error(
      `Unknown platform: ${platformName}. Please, use one of: ${Object.values(
        supportedPlatforms
      ).join(', ')}.`
    );
  }

  const { scheme, mode } = await getConfiguration(
    xcodeProject,
    process.cwd(),
    args,
    platformName
  );

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

      return udid
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
  logger.debug(
    `Building ${color.dim(`(using "xcodebuild ${xcodebuildArgs.join(' ')}")`)}`
  );

  let buildOutput = '';

  return new Promise<string>((resolve, reject) => {
    const buildProcess = child_process.spawn(
      'xcodebuild',
      xcodebuildArgs,
      getProcessOptions(args)
    );

    loader.start(`Building the app${'.'.repeat(buildOutput.length % 10)}`);

    buildProcess.stdout.on('data', (data: Buffer) => {
      const stringData = data.toString();
      buildOutput += stringData;
      if (logger.isVerbose()) {
        logger.debug(stringData);
      }
    });

    buildProcess.on('close', (code: number) => {
      if (code !== 0) {
        Array.from(prettifyXcodebuildMessages(buildOutput)).forEach((error) =>
          logger.error(error)
        );
        reject(
          new Error(`
          Failed to build ${getPlatformInfo(platformName).readableName} project.

          "xcodebuild" exited with error code '${code}'. To debug build
          logs further, consider building your app with Xcode.app, by opening
          '${xcodeProject.name}'.`)
        );
        return;
      }

      loader.stop('Successfully built the app');
      resolve(buildOutput);
    });
  });
};

function getProcessOptions<T extends BuildFlags>(
  args: T
): SpawnOptionsWithoutStdio {
  if (
    'packager' in args &&
    typeof args.packager === 'boolean' &&
    args.packager
  ) {
    const terminal =
      'terminal' in args && typeof args.terminal === 'string'
        ? args.terminal
        : '';

    const port =
      'port' in args && typeof args.port === 'number' ? String(args.port) : '';

    return {
      env: {
        ...process.env,
        RCT_TERMINAL: terminal,
        RCT_METRO_PORT: port,
      },
    };
  }

  return {
    env: process.env,
  };
}

export { buildProject };
