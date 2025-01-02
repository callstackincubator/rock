import path from 'path';
import fs from 'fs';
import isInteractive from 'is-interactive';
import { logger, RnefError } from '@rnef/tools';
import { listDevicesAndSimulators } from '../../utils/listDevices.js';
import { promptForDeviceSelection } from '../../utils/prompts.js';
import { getConfiguration } from '../build/getConfiguration.js';
import { getPlatformInfo } from '../../utils/getPlatformInfo.js';
import { matchingDevice } from './matchingDevice.js';
import { runOnDevice } from './runOnDevice.js';
import { runOnSimulator } from './runOnSimulator.js';
import {
  ApplePlatform,
  Device,
  ProjectConfig,
  XcodeProjectInfo,
} from '../../types/index.js';
import { RunFlags } from './runOptions.js';
import { selectFromInteractiveMode } from '../../utils/selectFromInteractiveMode.js';
import { intro, outro, spinner } from '@clack/prompts';
import { runOnMac } from './runOnMac.js';
import { runOnMacCatalyst } from './runOnMacCatalyst.js';
import { cacheRecentDevice } from './recentDevices.js';

export const createRun = async (
  platformName: ApplePlatform,
  projectConfig: ProjectConfig,
  args: RunFlags,
  projectRoot: string
) => {
  intro('Running on iOS');

  const { readableName: platformReadableName } = getPlatformInfo(platformName);
  const { xcodeProject, sourceDir } = projectConfig;

  if (!xcodeProject) {
    throw new RnefError(
      `Could not find Xcode project files in "${sourceDir}" folder. Please make sure that you have installed Cocoapods and "${sourceDir}" is a valid path`
    );
  }

  normalizeArgs(args, projectRoot, xcodeProject);

  const { scheme, mode } = args.interactive
    ? await selectFromInteractiveMode(
        xcodeProject,
        sourceDir,
        args.scheme,
        args.mode
      )
    : await getConfiguration(
        xcodeProject,
        sourceDir,
        args.scheme,
        args.mode,
        platformName
      );

  if (platformName === 'macos') {
    await runOnMac(xcodeProject, sourceDir, mode, scheme, args);
    outro('Success 🎉.');
    return;
  } else if (args.catalyst) {
    await runOnMacCatalyst(
      platformName,
      mode,
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
    throw new RnefError(
      `${platformReadableName} devices or simulators not detected. Install simulators via Xcode or connect a physical ${platformReadableName} device`
    );
  }
  loader.stop('Found available devices and simulators.');
  const device = await selectDevice(devices, args, platformName, projectRoot);

  if (device) {
    cacheRecentDevice(device, projectRoot, platformName);
    if (device.type === 'simulator') {
      await runOnSimulator(
        device,
        xcodeProject,
        sourceDir,
        platformName,
        mode,
        scheme,
        args
      );
    } else if (device.type === 'device') {
      await runOnDevice(
        device,
        platformName,
        mode,
        scheme,
        xcodeProject,
        sourceDir,
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
        const simulator = await promptForDeviceSelection(
          devices,
          projectRoot,
          platformName
        );
        bootedSimulators.push(simulator);
        cacheRecentDevice(simulator, projectRoot, platformName);
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
        mode,
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
  platform: ApplePlatform,
  projectRoot: string
) {
  const { interactive } = args;
  let device;
  if (interactive) {
    device = await promptForDeviceSelection(devices, projectRoot, platform);
  } else if (args.device) {
    device = matchingDevice(devices, args.device);
  } else if (!device) {
    if (args.device) {
      logger.warn(
        `No devices or simulators found matching "${args.device}". Falling back to default simulator.`
      );
      // setting device to undefined to avoid buildProject to use it
      args.device = undefined;
    }
  }
  return device;
}

function normalizeArgs(
  args: RunFlags,
  projectRoot: string,
  xcodeProject: XcodeProjectInfo
) {
  if (!args.mode) {
    args.mode = 'Debug';
  }
  if (!args.scheme) {
    args.scheme = path.basename(
      xcodeProject.name,
      path.extname(xcodeProject.name)
    );
  }
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
