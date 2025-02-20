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
} from '../../types/index.js';
import { getConfiguration } from '../../utils/getConfiguration.js';
import { getInfo } from '../../utils/getInfo.js';
import { getPlatformInfo } from '../../utils/getPlatformInfo.js';
import { getScheme } from '../../utils/getScheme.js';
import { listDevicesAndSimulators } from '../../utils/listDevices.js';
import { installPodsIfNeeded } from '../../utils/pods.js';
import { fetchCachedBuild } from './fetchCachedBuild.js';
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

  const info = await getInfo(xcodeProject, sourceDir);

  if (!info) {
    throw new RnefError('Failed to get Xcode project information');
  }
  const scheme = await getScheme(
    info.schemes,
    args.scheme,
    args.interactive,
    xcodeProject.name
  );
  const configuration = await getConfiguration(
    info.configurations,
    args.configuration,
    args.interactive
  );

  if (platformName === 'macos') {
    await runOnMac(xcodeProject, sourceDir, configuration, scheme, args);
    outro('Success 🎉.');
    return;
  } else if (args.catalyst) {
    await runOnMacCatalyst(
      platformName,
      configuration,
      scheme,
      xcodeProject,
      sourceDir,
      args
    );
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
  const device = await selectDevice(devices, args, platformName);

  if (device) {
    cacheRecentDevice(device, platformName);
    if (device.type === 'simulator') {
      await runOnSimulator(
        device,
        xcodeProject,
        sourceDir,
        platformName,
        configuration,
        scheme,
        args
      );
    } else if (device.type === 'device') {
      await runOnDevice(
        device,
        platformName,
        configuration,
        scheme,
        xcodeProject,
        sourceDir,
        remoteCacheProvider,
        args
      );
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
      await runOnSimulator(
        simulator,
        xcodeProject,
        sourceDir,
        platformName,
        configuration,
        scheme,
        args
      );
    }
  }

  outro('Success 🎉.');
};

async function selectDevice(
  devices: Device[],
  args: RunFlags,
  platform: ApplePlatform
) {
  const { interactive } = args;
  let device;
  if (interactive) {
    device = await promptForDeviceSelection(devices, platform);
  } else if (args.device) {
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
  }

  if (args.interactive && !isInteractive()) {
    logger.warn(
      'Interactive mode is not supported in non-interactive environments.'
    );
    args.interactive = false;
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
