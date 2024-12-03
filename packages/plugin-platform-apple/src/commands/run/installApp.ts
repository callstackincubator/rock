import child_process from 'child_process';
import { logger } from '@callstack/rnef-tools';
import { getBuildPath } from './getBuildPath.js';
import { getBuildSettings } from './getBuildSettings.js';
import path from 'path';
import { ApplePlatform, XcodeProjectInfo } from '../../types/index.js';
import spawn from 'nano-spawn';

function handleLaunchResult(
  success: boolean,
  errorMessage: string,
  errorDetails = ''
) {
  if (!success) {
    logger.error(errorMessage, errorDetails);
  }
}

type Options = {
  buildOutput: string;
  xcodeProject: XcodeProjectInfo;
  mode: string;
  scheme: string;
  target?: string;
  udid: string;
  binaryPath?: string;
  platform?: ApplePlatform;
};

export default async function installApp({
  buildOutput,
  xcodeProject,
  mode,
  scheme,
  target,
  udid,
  binaryPath,
  platform,
}: Options) {
  let appPath = binaryPath;

  const buildSettings = await getBuildSettings(
    xcodeProject,
    mode,
    buildOutput,
    scheme,
    target
  );

  if (!buildSettings) {
    throw new Error('Failed to get build settings for your project');
  }

  if (!appPath) {
    appPath = getBuildPath(buildSettings, platform);
  }

  const targetBuildDir = buildSettings.TARGET_BUILD_DIR;
  const infoPlistPath = buildSettings.INFOPLIST_PATH;

  if (!infoPlistPath) {
    throw new Error('Failed to find Info.plist');
  }

  if (!targetBuildDir) {
    throw new Error('Failed to get target build directory.');
  }

  logger.debug(`Installing "${path.basename(appPath)}"`);

  if (udid && appPath) {
    await spawn('xcrun', ['simctl', 'install', udid, appPath], {
      stdio: logger.isVerbose() ? 'inherit' : ['ignore', 'pipe', 'inherit'],
    });
  }

  const { stdout } = await spawn('/usr/libexec/PlistBuddy', [
    '-c',
    'Print:CFBundleIdentifier',
    path.join(targetBuildDir, infoPlistPath),
  ]);
  const bundleID = stdout.trim();

  logger.debug(`Launching "${bundleID}"`);

  const result = child_process.spawnSync('xcrun', [
    'simctl',
    'launch',
    udid,
    bundleID,
  ]);

  handleLaunchResult(
    result.status === 0,
    'Failed to launch the app on simulator',
    result.stderr.toString()
  );
}
