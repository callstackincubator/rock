import path from 'node:path';
import { logger, RnefError } from '@rnef/tools';
import type { SubprocessError } from 'nano-spawn';
import spawn from 'nano-spawn';
import type { ApplePlatform, XcodeProjectInfo } from '../../types/index.js';
import { getBuildPath } from './getBuildPath.js';
import { getBuildSettings } from './getBuildSettings.js';

type Options = {
  xcodeProject: XcodeProjectInfo;
  sourceDir: string;
  mode: string;
  scheme: string;
  target?: string;
  udid: string;
  binaryPath?: string;
  platform: ApplePlatform;
};
console.log('xd');
export default async function installApp({
  xcodeProject,
  sourceDir,
  mode,
  scheme,
  target,
  udid,
  binaryPath,
  platform,
}: Options) {
  let appPath = binaryPath;
  let targetBuildDir;
  let infoPlistPath = 'Info.plist';

  if (!appPath) {
    const buildSettings = await getBuildSettings(
      xcodeProject,
      sourceDir,
      mode,
      `export PLATFORM_NAME=${getPlatformSDK(platform)}`, // simulate build output
      scheme,
      target
    );

    if (!buildSettings) {
      throw new Error('Failed to get build settings for your project');
    }

    appPath = getBuildPath(buildSettings, platform);
    targetBuildDir = buildSettings.TARGET_BUILD_DIR;
    infoPlistPath = buildSettings.INFOPLIST_PATH;

    if (!infoPlistPath) {
      throw new Error('Failed to find Info.plist');
    }

    if (!targetBuildDir) {
      throw new Error('Failed to get target build directory.');
    }
  }

  await spawn('xcrun', ['simctl', 'install', udid, appPath], {
    stdio: logger.isVerbose() ? 'inherit' : ['ignore', 'pipe', 'inherit'],
  });

  logger.debug(`Installing "${path.basename(appPath)}"`);

  const buildDir = targetBuildDir || appPath;

  const { stdout } = await spawn('/usr/libexec/PlistBuddy', [
    '-c',
    'Print:CFBundleIdentifier',
    path.join(buildDir, infoPlistPath),
  ]);
  const bundleID = stdout.trim();

  logger.debug(`Launching "${bundleID}"`);

  try {
    await spawn('xcrun', ['simctl', 'launch', udid, bundleID]);
  } catch (error) {
    throw new RnefError(
      `Failed to launch the app on simulator. ${
        (error as SubprocessError).stderr
      }`,
      { cause: error }
    );
  }
}

export function getPlatformSDK(platform: ApplePlatform) {
  switch (platform) {
    case 'ios':
      return 'iphonesimulator';
    case 'macos':
      return 'macosx';
    case 'tvos':
      return 'appletvsimulator';
    case 'visionos':
      return 'xrsimulator';
  }
}
