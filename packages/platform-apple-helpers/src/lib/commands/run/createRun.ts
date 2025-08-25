import fs from 'node:fs';
import path from 'node:path';
import type { FingerprintSources, RemoteBuildCache } from '@rock-js/tools';
import {
  color,
  formatArtifactName,
  getBinaryPath,
  isInteractive,
  logger,
  promptSelect,
  RockError,
  saveLocalBuildCache,
} from '@rock-js/tools';
import type {
  ApplePlatform,
  Device,
  ProjectConfig,
} from '../../types/index.js';
import { buildApp } from '../../utils/buildApp.js';
import { getPlatformInfo } from '../../utils/getPlatformInfo.js';
import { listDevicesAndSimulators } from '../../utils/listDevices.js';
import { matchingDevice } from './matchingDevice.js';
import { cacheRecentDevice, sortByRecentDevices } from './recentDevices.js';
import { runOnDevice } from './runOnDevice.js';
import { runOnMac } from './runOnMac.js';
import { runOnMacCatalyst } from './runOnMacCatalyst.js';
import { launchSimulator, runOnSimulator } from './runOnSimulator.js';
import type { RunFlags } from './runOptions.js';

export const createRun = async ({
  platformName,
  projectConfig,
  args,
  projectRoot,
  remoteCacheProvider,
  fingerprintOptions,
  reactNativePath,
}: {
  platformName: ApplePlatform;
  projectConfig: ProjectConfig;
  args: RunFlags;
  projectRoot: string;
  remoteCacheProvider: null | (() => RemoteBuildCache) | undefined;
  fingerprintOptions: FingerprintSources;
  reactNativePath: string;
}) => {
  validateArgs(args, projectRoot);

  const devices = await listDevicesAndSimulators(platformName);
  if (devices.length === 0) {
    const { readableName } = getPlatformInfo(platformName);
    throw new RockError(
      `No devices or simulators detected. Install simulators via Xcode or connect a physical ${readableName} device.`,
    );
  }
  const device = await selectDevice(devices, args.device);
  const destination = args.destination
    ? // there can be multiple destinations, so we'll pick the first one
      args.destination[0].match(/simulator/i)
      ? 'simulator'
      : 'device'
    : undefined;

  async function getArtifactName({
    silent,
    deviceType,
  }: {
    silent?: boolean;
    deviceType: string;
  }) {
    return await formatArtifactName({
      platform: 'ios',
      traits: [deviceType, args.configuration ?? 'Debug'],
      root: projectRoot,
      fingerprintOptions,
      silent,
    });
  }

  // Check if the device argument looks like a UDID
  // (assuming UDIDs are alphanumeric and have specific length)
  const udid =
    args.device && /^[A-Fa-f0-9-]{25,}$/.test(args.device)
      ? args.device
      : undefined;

  const deviceName = udid ? undefined : args.device;

  if (platformName === 'macos') {
    const artifactName = await getArtifactName({ deviceType: 'macos' });
    const binaryPath = await getBinaryPath({
      artifactName,
      binaryPathFlag: args.binaryPath,
      localFlag: args.local,
      remoteCacheProvider,
      fingerprintOptions,
      sourceDir: projectConfig.sourceDir,
    });
    const { appPath } = await buildApp({
      args,
      projectConfig,
      platformName,
      projectRoot,
      udid,
      deviceName,
      reactNativePath,
      binaryPath,
    });
    await runOnMac(appPath);
    return;
  } else if (args.catalyst) {
    const artifactName = await getArtifactName({ deviceType: 'catalyst' });
    const binaryPath = await getBinaryPath({
      artifactName,
      binaryPathFlag: args.binaryPath,
      localFlag: args.local,
      remoteCacheProvider,
      fingerprintOptions,
      sourceDir: projectConfig.sourceDir,
    });
    const { appPath, scheme } = await buildApp({
      args,
      projectConfig,
      platformName,
      projectRoot,
      udid,
      deviceName,
      reactNativePath,
      binaryPath,
    });
    if (scheme) {
      await runOnMacCatalyst(appPath, scheme);
      return;
    } else {
      throw new RockError('Failed to get project scheme');
    }
  }

  if (device) {
    //     if (device.type !== deviceOrSimulator) {
    //       throw new RockError(
    //         `Selected device "${device.name}" is not a ${deviceOrSimulator}.
    // Please either use "--destination ${
    //           deviceOrSimulator === 'simulator' ? 'device' : 'simulator'
    //         }" flag or select available ${deviceOrSimulator}:
    // ${devices
    //   .filter(({ type }) => type === deviceOrSimulator)
    //   .map(({ name }) => `• ${name}`)
    //   .join('\n')}`,
    //       );
    //     }
    cacheRecentDevice(device, platformName);
    if (device.type === 'simulator') {
      let artifactName = await getArtifactName({ deviceType: device.type });
      const binaryPath = await getBinaryPath({
        artifactName,
        binaryPathFlag: args.binaryPath,
        localFlag: args.local,
        remoteCacheProvider,
        fingerprintOptions,
        sourceDir: projectConfig.sourceDir,
      });
      const [, { appPath, infoPlistPath, didInstallPods }] = await Promise.all([
        launchSimulator(device),
        buildApp({
          args,
          projectConfig,
          platformName,
          udid: device.udid,
          projectRoot,
          reactNativePath,
          binaryPath,
        }),
      ]);
      // After installing pods the fingerprint likely changes.
      // We update the artifact name to reflect the new fingerprint and store proper entry in the local cache.
      if (didInstallPods) {
        artifactName = await getArtifactName({
          silent: true,
          deviceType: device.type,
        });
      }
      saveLocalBuildCache(artifactName, appPath);
      await runOnSimulator(device, appPath, infoPlistPath);
    } else if (device.type === 'device') {
      const artifactName = await getArtifactName({ deviceType: device.type });
      const binaryPath = await getBinaryPath({
        artifactName,
        binaryPathFlag: args.binaryPath,
        localFlag: args.local,
        remoteCacheProvider,
        fingerprintOptions,
        sourceDir: projectConfig.sourceDir,
      });
      const { appPath, bundleIdentifier } = await buildApp({
        args,
        projectConfig,
        platformName,
        udid: device.udid,
        projectRoot,
        reactNativePath,
        binaryPath,
      });
      await runOnDevice(
        device,
        appPath,
        projectConfig.sourceDir,
        bundleIdentifier,
      );
    }
    return;
  } else {
    const bootedDevices = devices.filter(
      ({ state, platform, type }) =>
        state === 'Booted' &&
        platform === platformName &&
        (destination ? destination === type : true),
    );
    if (bootedDevices.length === 0) {
      // fallback to present all devices when no device is selected
      if (isInteractive()) {
        const selectedDevice = await promptForDeviceSelection(
          devices.filter(
            ({ platform, type }) =>
              platform === platformName &&
              (destination ? destination === type : true),
          ),
          platformName,
        );
        bootedDevices.push(selectedDevice);
        cacheRecentDevice(selectedDevice, platformName);
      } else {
        logger.debug(
          'No booted devices or simulators found. Launching first available simulator...',
        );
        const simulator = devices.filter(
          (device) => device.type === 'simulator',
        )[0];
        if (simulator) {
          bootedDevices.push(simulator);
        } else {
          throw new RockError(
            'No Apple simulators found. Install simulators via Xcode.',
          );
        }
      }
    }
    for (const bootedDevice of bootedDevices) {
      let artifactName = await getArtifactName({
        deviceType: bootedDevice.type,
      });
      const binaryPath = await getBinaryPath({
        artifactName,
        binaryPathFlag: args.binaryPath,
        localFlag: args.local,
        remoteCacheProvider,
        fingerprintOptions,
        sourceDir: projectConfig.sourceDir,
      });
      const [, { appPath, infoPlistPath, bundleIdentifier, didInstallPods }] =
        await Promise.all([
          launchSimulator(bootedDevice),
          buildApp({
            args,
            projectConfig,
            platformName,
            udid: bootedDevice.udid,
            projectRoot,
            reactNativePath,
            binaryPath,
          }),
        ]);
      // After installing pods the fingerprint likely changes.
      // We update the artifact name to reflect the new fingerprint and store proper entry in the local cache.
      if (didInstallPods) {
        artifactName = await getArtifactName({
          silent: true,
          deviceType: bootedDevice.type,
        });
      }
      saveLocalBuildCache(artifactName, appPath);
      if (bootedDevice.type === 'simulator') {
        await runOnSimulator(bootedDevice, appPath, infoPlistPath);
      } else {
        await runOnDevice(
          bootedDevice,
          appPath,
          projectConfig.sourceDir,
          bundleIdentifier,
        );
      }
    }
  }
};

async function selectDevice(
  devices: Device[],
  selectedDevice: string | undefined,
) {
  let device;
  if (selectedDevice) {
    device = matchingDevice(devices, selectedDevice);
  }
  if (!device && selectedDevice) {
    logger.warn(
      `No devices or simulators found matching "${selectedDevice}". Falling back to default simulator.`,
    );
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
        `"--binary-path" was specified, but the file was not found at "${args.binaryPath}".`,
      );
    }
    // No need to install pods if binary path is provided
    args.installPods = false;
  }
}

function promptForDeviceSelection(
  devices: Device[],
  platformName: ApplePlatform,
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
