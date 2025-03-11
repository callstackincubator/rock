import fs from 'node:fs';
import path from 'node:path';
import { getProjectConfig } from '@react-native-community/cli-config-apple';
import type { SupportedRemoteCacheProviders } from '@rnef/tools';
import {
  color,
  intro,
  isInteractive,
  logger,
  outro,
  promptSelect,
  RnefError,
  spinner,
} from '@rnef/tools';
import type {
  ApplePlatform,
  Device,
  ProjectConfig,
  XcodeProjectInfo,
} from '../../types/index.js';
import { getConfiguration } from '../../utils/getConfiguration.js';
import { getInfo } from '../../utils/getInfo.js';
import type { PlatformSDK } from '../../utils/getPlatformInfo.js';
import {
  getDevicePlatformSDK,
  getPlatformInfo,
  getSimulatorPlatformSDK,
} from '../../utils/getPlatformInfo.js';
import { getScheme } from '../../utils/getScheme.js';
import { listDevicesAndSimulators } from '../../utils/listDevices.js';
import { installPodsIfNeeded } from '../../utils/pods.js';
import { buildProject } from '../build/buildProject.js';
import { fetchCachedBuild } from './fetchCachedBuild.js';
import { getBuildSettings } from './getBuildSettings.js';
import { matchingDevice } from './matchingDevice.js';
import { cacheRecentDevice, sortByRecentDevices } from './recentDevices.js';
import { runOnDevice } from './runOnDevice.js';
import { runOnMac } from './runOnMac.js';
import { runOnMacCatalyst } from './runOnMacCatalyst.js';
import { runOnSimulator } from './runOnSimulator.js';
import type { RunFlags } from './runOptions.js';

export const createRun = async (
  platformName: ApplePlatform,
  projectConfig: ProjectConfig,
  args: RunFlags,
  projectRoot: string,
  remoteCacheProvider: SupportedRemoteCacheProviders | undefined
) => {
  intro('Running on iOS');

  if (!args.binaryPath && args.remoteCache) {
    const cachedBuild = await fetchCachedBuild({
      configuration: args.configuration ?? 'Debug',
      distribution: args.device ? 'device' : 'simulator', // TODO: replace with better logic
      remoteCacheProvider,
    });
    if (cachedBuild) {
      // @todo replace with a more generic way to pass binary path
      args.binaryPath = cachedBuild.binaryPath;
    }
  }

  let { xcodeProject, sourceDir } = projectConfig;

  if (!xcodeProject) {
    throw new RnefError(
      `Could not find Xcode project files in "${sourceDir}" folder. Please make sure that you have installed Cocoapods and "${sourceDir}" is a valid path`
    );
  }

  validateArgs(args, projectRoot);

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

  if (platformName === 'macos') {
    const { appPath } = await buildApp({
      args,
      xcodeProject,
      sourceDir,
      platformName,
      platformSDK: getSimulatorPlatformSDK(platformName),
    });
    await runOnMac(appPath);
    outro('Success 🎉.');
    return;
  } else if (args.catalyst) {
    const info = await getInfo(xcodeProject, sourceDir);
    if (!info) {
      throw new RnefError('Failed to get Xcode project information');
    }
    const scheme = await getScheme(
      info.schemes,
      args.scheme,
      xcodeProject.name
    );
    const { appPath } = await buildApp({
      args,
      xcodeProject,
      sourceDir,
      platformName,
      platformSDK: getSimulatorPlatformSDK(platformName),
      selectedScheme: scheme,
    });
    await runOnMacCatalyst(appPath, scheme);
    outro('Success 🎉.');
    return;
  }

  const loader = spinner();
  loader.start('Looking for available devices and simulators');
  const devices = await listDevicesAndSimulators(platformName);
  if (devices.length === 0) {
    const { readableName } = getPlatformInfo(platformName);
    throw new RnefError(
      `No devices or simulators detected. Install simulators via Xcode or connect a physical ${readableName} device.`
    );
  }
  loader.stop('Found available devices and simulators.');
  const device = await selectDevice(devices, args);

  if (device) {
    cacheRecentDevice(device, platformName);
    if (device.type === 'simulator') {
      const { appPath, infoPlistPath } = await buildApp({
        args,
        xcodeProject,
        sourceDir,
        platformName,
        platformSDK: getSimulatorPlatformSDK(platformName),
        udid: device.udid,
      });
      await runOnSimulator(device, appPath, infoPlistPath);
    } else if (device.type === 'device') {
      const { appPath } = await buildApp({
        args,
        xcodeProject,
        sourceDir,
        platformName,
        platformSDK: getDevicePlatformSDK(platformName),
        udid: device.udid,
      });
      await runOnDevice(device, appPath, sourceDir);
    }
    outro('Success 🎉.');
    return;
  } else {
    const bootedSimulators = devices.filter(
      ({ state, type }) => state === 'Booted' && type === 'simulator'
    );
    if (bootedSimulators.length === 0) {
      // fallback to present all devices when no device is selected
      if (isInteractive()) {
        const simulator = await promptForDeviceSelection(devices, platformName);
        bootedSimulators.push(simulator);
        cacheRecentDevice(simulator, platformName);
      } else {
        logger.debug(
          'No booted devices or simulators found. Launching first available simulator...'
        );
        const simulator = devices.filter(
          (device) => device.type === 'simulator'
        )[0];
        if (simulator) {
          bootedSimulators.push(simulator);
        } else {
          throw new RnefError(
            'No Apple simulators found. Install simulators via Xcode.'
          );
        }
      }
    }
    for (const simulator of bootedSimulators) {
      const { appPath, infoPlistPath } = await buildApp({
        args,
        xcodeProject,
        sourceDir,
        platformName,
        platformSDK: getSimulatorPlatformSDK(platformName),
        udid: simulator.udid,
      });
      await runOnSimulator(simulator, appPath, infoPlistPath);
    }
  }

  outro('Success 🎉.');
};

async function buildApp({
  args,
  xcodeProject,
  sourceDir,
  platformName,
  platformSDK,
  udid,
  selectedScheme,
}: {
  args: RunFlags;
  xcodeProject: XcodeProjectInfo;
  sourceDir: string;
  platformName: ApplePlatform;
  platformSDK: PlatformSDK;
  udid?: string;
  selectedScheme?: string;
}) {
  let appPath = args.binaryPath;
  let infoPlistPath;
  if (!appPath) {
    const info = await getInfo(xcodeProject, sourceDir);
    if (!info) {
      throw new RnefError('Failed to get Xcode project information');
    }
    const scheme =
      selectedScheme ??
      (await getScheme(info.schemes, args.scheme, xcodeProject.name));
    const configuration = await getConfiguration(
      info.configurations,
      args.configuration
    );
    await buildProject({
      xcodeProject,
      sourceDir,
      platformName,
      udid,
      scheme,
      configuration,
      args,
    });
    const buildSettings = await getBuildSettings(
      xcodeProject,
      sourceDir,
      configuration,
      platformSDK,
      scheme
    );
    appPath = buildSettings.appPath;
    infoPlistPath = buildSettings.infoPlistPath;
  } else {
    // @todo Info.plist is hardcoded when reading from binaryPath
    infoPlistPath = path.join(appPath, 'Info.plist');
  }
  return { appPath, infoPlistPath };
}

async function selectDevice(devices: Device[], args: RunFlags) {
  let device;
  if (args.device) {
    device = matchingDevice(devices, args.device);
  }
  if (!device && args.device) {
    logger.warn(
      `No devices or simulators found matching "${args.device}". Falling back to default simulator.`
    );
    // setting device to undefined to avoid buildProject to use it
    args.device = undefined;
  }
  return device;
}

function validateArgs(args: RunFlags, projectRoot: string) {
  if (args.binaryPath) {
    args.binaryPath = path.isAbsolute(args.binaryPath)
      ? args.binaryPath
      : path.join(projectRoot, args.binaryPath);

    if (!fs.existsSync(args.binaryPath)) {
      throw new Error(
        `"--binary-path" was specified, but the file was not found at "${args.binaryPath}".`
      );
    }
    // No need to install pods if binary path is provided
    args.installPods = false;
  }
}

function promptForDeviceSelection(
  devices: Device[],
  platformName: ApplePlatform
) {
  const sortedDevices = sortByRecentDevices(devices, platformName);
  return promptSelect({
    message: 'Select the device / simulator you want to use',
    options: sortedDevices.map((d) => {
      const markDevice = d.type === 'device' ? ` - (physical device)` : '';
      return {
        label: `${d.name} ${color.dim(`(${d.version})${markDevice}`)}`,
        value: d,
      };
    }),
  });
}
