import { color, logger, RnefError, spawn } from '@rnef/tools';
import type { XcodeProjectInfo } from '../../types/index.js';
import { getSimulatorPlatformSDK } from '../../utils/getPlatformInfo.js';
import { buildProject } from '../build/buildProject.js';
import { getBuildPath } from './getBuildPath.js';
import { getBuildSettings } from './getBuildSettings.js';
import type { RunFlags } from './runOptions.js';

export async function runOnMac(
  xcodeProject: XcodeProjectInfo,
  sourceDir: string,
  configuration: string,
  scheme: string,
  args: RunFlags
) {
  await buildProject(
    xcodeProject,
    sourceDir,
    'macos',
    undefined,
    scheme,
    configuration,
    args
  );

  await openApp({
    xcodeProject,
    sourceDir,
    configuration,
    scheme,
    target: args.target,
    binaryPath: args.binaryPath,
  });
}

type Options = {
  xcodeProject: XcodeProjectInfo;
  sourceDir: string;
  configuration: string;
  scheme: string;
  target?: string;
  binaryPath?: string;
};

async function openApp({
  xcodeProject,
  sourceDir,
  configuration,
  scheme,
  target,
  binaryPath,
}: Options) {
  let appPath = binaryPath;

  const buildSettings = await getBuildSettings(
    xcodeProject,
    sourceDir,
    configuration,
    getSimulatorPlatformSDK('macos'),
    scheme,
    target
  );

  if (!buildSettings) {
    throw new RnefError('Failed to get build settings for your project');
  }

  if (!appPath) {
    appPath = getBuildPath(buildSettings, 'macos');
  }

  logger.debug(`Opening "${color.bold(appPath)}"`);

  try {
    await spawn('open', [appPath]);
  } catch (error) {
    throw new RnefError('Failed to launch the app', { cause: error });
  }
}
