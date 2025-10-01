import path from 'node:path';
import { color, logger, RockError, spawn } from '@rock-js/tools';
import type { ApplePlatform, XcodeProjectInfo } from '../../types/index.js';

type BuildSettings = {
  TARGET_BUILD_DIR: string;
  INFOPLIST_PATH: string;
  EXECUTABLE_FOLDER_PATH: string;
  FULL_PRODUCT_NAME: string;
  WRAPPER_EXTENSION: string;
  PRODUCT_BUNDLE_IDENTIFIER: string;
};

export async function getBuildSettings({
  xcodeProject,
  sourceDir,
  platformName,
  configuration,
  destinations,
  scheme,
  target,
  buildFolder,
}: {
  xcodeProject: XcodeProjectInfo;
  sourceDir: string;
  platformName: ApplePlatform;
  configuration: string;
  destinations: string[];
  scheme: string;
  target?: string;
  buildFolder?: string;
}): Promise<{
  appPath: string;
  infoPlistPath: string;
  bundleIdentifier: string;
}> {
  const destination = destinations[0];
  const sdk = destination.match(/simulator/i)
    ? getSimulatorPlatformSDK(platformName)
    : getDevicePlatformSDK(platformName);

  const { stdout: buildSettingsOutput } = await spawn(
    'xcodebuild',
    [
      xcodeProject.isWorkspace ? '-workspace' : '-project',
      xcodeProject.name,
      ...(buildFolder ? ['-derivedDataPath', buildFolder] : []),
      '-scheme',
      scheme,
      '-configuration',
      configuration,
      '-sdk',
      sdk,
      // -showBuildSettings supports exactly one -destination argument
      '-destination',
      destination,
      '-showBuildSettings',
      '-json',
    ],
    { cwd: sourceDir, stdio: 'pipe' },
  );

  const settings: {
    action: string;
    buildSettings: BuildSettings;
    target: string;
  }[] = JSON.parse(buildSettingsOutput).filter(
    ({
      buildSettings: { WRAPPER_EXTENSION },
    }: {
      buildSettings: BuildSettings;
    }) => WRAPPER_EXTENSION === 'app' || WRAPPER_EXTENSION === 'framework',
  );
  const targets = settings.map(
    ({ target: settingsTarget }: { target: string }) => settingsTarget,
  );
  if (settings.length === 0) {
    throw new RockError(
      `Failed to get build settings for your project. Looking for "app" or "framework" wrapper extension but found: ${wrapperExtension}`,
    );
  }

  let selectedTarget = targets[0];

  if (target) {
    if (!targets.includes(target)) {
      logger.info(
        `Target ${color.bold(target)} not found for scheme ${color.bold(
          scheme,
        )}, automatically selected target ${color.bold(selectedTarget)}`,
      );
    } else {
      selectedTarget = target;
    }
  }

  logger.debug(`Selected target: ${selectedTarget}`);

  // Find app in all building settings - look for WRAPPER_EXTENSION: 'app',
  const targetIndex = targets.indexOf(selectedTarget);
  const buildSettings = settings[targetIndex].buildSettings;

  if (!buildSettings) {
    throw new RockError('Failed to get build settings for your project');
  }

  const appPath = getBuildPath(buildSettings, platformName);
  const infoPlistPath = buildSettings.INFOPLIST_PATH;
  const targetBuildDir = buildSettings.TARGET_BUILD_DIR;

  return {
    appPath,
    infoPlistPath: path.join(targetBuildDir, infoPlistPath),
    bundleIdentifier: buildSettings.PRODUCT_BUNDLE_IDENTIFIER,
  };
}

function getBuildPath(
  buildSettings: BuildSettings,
  platformName: ApplePlatform,
) {
  const targetBuildDir = buildSettings.TARGET_BUILD_DIR;
  const executableFolderPath = buildSettings.EXECUTABLE_FOLDER_PATH;
  const fullProductName = buildSettings.FULL_PRODUCT_NAME;

  if (!targetBuildDir) {
    throw new Error('Failed to get the target build directory.');
  }

  if (!executableFolderPath) {
    throw new Error('Failed to get the app name.');
  }

  if (!fullProductName) {
    throw new Error('Failed to get product name.');
  }

  if (platformName === 'macos') {
    return path.join(targetBuildDir, fullProductName);
  } else {
    return path.join(targetBuildDir, executableFolderPath);
  }
}

type PlatformSDK =
  | 'iphonesimulator'
  | 'macosx'
  | 'appletvsimulator'
  | 'xrsimulator'
  | 'iphoneos'
  | 'appletvos'
  | 'xr';

function getSimulatorPlatformSDK(platform: ApplePlatform): PlatformSDK {
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

function getDevicePlatformSDK(platform: ApplePlatform): PlatformSDK {
  switch (platform) {
    case 'ios':
      return 'iphoneos';
    case 'macos':
      return 'macosx';
    case 'tvos':
      return 'appletvos';
    case 'visionos':
      return 'xr';
  }
}
