import path from 'path';
import fs from 'fs';
import { logger, cacheManager } from '@callstack/rnef-tools';
import listDevices from '../../utils/listDevices.js';
import { promptForDeviceSelection } from '../../utils/prompts.js';
import { getConfiguration } from '../build/getConfiguration.js';
import { getFallbackSimulator } from './getFallbackSimulator.js';
import { getPlatformInfo } from './getPlatformInfo.js';
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
import { outro, spinner } from '@clack/prompts';
import { runOnMac } from './runOnMac.js';

export const createRun = async (
  platformName: ApplePlatform,
  projectConfig: ProjectConfig,
  args: RunFlags,
  projectRoot: string
) => {
  const { sdkNames, readableName: platformReadableName } =
    getPlatformInfo(platformName);

  const { xcodeProject, sourceDir } = projectConfig;

  if (!xcodeProject) {
    logger.error(
      `Could not find Xcode project files in "${sourceDir}" folder. Please make sure that you have installed Cocoapods and "${sourceDir}" is a valid path`
    );
    process.exit(1);
  }

  normalizeArgs(args, projectRoot, xcodeProject);
  // @todo replace chdir with running the command in the {cwd: sourceDir}
  process.chdir(sourceDir);

  const { scheme, mode } = args.interactive
    ? await selectFromInteractiveMode(xcodeProject, args.scheme, args.mode)
    : await getConfiguration(
        xcodeProject,
        args.scheme,
        args.mode,
        platformName
      );

  if (platformName === 'macos') {
    return await runOnMac(xcodeProject, mode, scheme, args);
  }

  const loader = spinner();
  loader.start('Looking for available devices and simulators');
  const devices = await listDevices(sdkNames);
  if (devices.length === 0) {
    return logger.error(
      `${platformReadableName} devices or simulators not detected. Install simulators via Xcode or connect a physical ${platformReadableName} device`
    );
  }
  loader.stop('Found available devices and simulators.');
  const device = await selectDevice(devices, args, projectRoot, platformName);

  if (device) {
    cachePreferredDevice(device, projectRoot);
    if (device.type === 'simulator') {
      await runOnSimulator(
        device,
        xcodeProject,
        platformName,
        mode,
        scheme,
        args
      );
    } else {
      await runOnDevice(device, platformName, mode, scheme, xcodeProject, args);
    }
    return;
  } else {
    if (args.device) {
      logger.warn(
        `No devices found matching "${args.device}". Falling back to default simulator.`
      );
      // setting device to undefined to avoid buildProject to use it
      args.device = undefined;
    } else if (args.udid) {
      logger.warn(
        `No devices found matching UDID "${args.udid}". Falling back to default simulator.`
      );
    } else if (args.simulator) {
      logger.warn(
        `No simulator found matching "${args.simulator}". Falling back to default simulator.`
      );
    }
    const bootedSimulators = devices.filter(
      ({ state, type }) => state === 'Booted' && type === 'simulator'
    );
    if (bootedSimulators.length === 0) {
      logger.debug(
        'No booted devices or simulators found. Launching first available simulator...'
      );
      bootedSimulators.push(
        await matchingSimulator(
          devices,
          platformName,
          args.simulator,
          args.udid
        )
      );
    }
    for (const simulator of bootedSimulators) {
      await runOnSimulator(
        simulator,
        xcodeProject,
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
  projectRoot: string,
  platform: ApplePlatform
) {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  const { name } = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const preferredDeviceUDID = cacheManager.get(name, 'lastUsedIOSDeviceId');

  if (args.interactive) {
    return promptForDeviceSelection(devices);
  } else if (args.udid) {
    return devices.find((d) => d.udid === args.udid);
  } else if (args.device) {
    return matchingDevice(devices, args.device);
  } else if (args.simulator) {
    return matchingSimulator(devices, platform, args.simulator, args.udid);
  } else if (preferredDeviceUDID) {
    return findPreferredDevice(devices, projectRoot);
  } else {
    return undefined;
  }
}

function getProjectNameFromPackageJson(projectRoot: string) {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  return JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')).name;
}

function cachePreferredDevice(device: Device, projectRoot: string) {
  const name = getProjectNameFromPackageJson(projectRoot);
  cacheManager.set(name, 'lastUsedIOSDeviceId', device.udid);
}

function findPreferredDevice(devices: Device[], projectRoot: string) {
  const name = getProjectNameFromPackageJson(projectRoot);
  const preferredDeviceUDID = cacheManager.get(name, 'lastUsedIOSDeviceId');
  return devices.find(({ udid }) => udid === preferredDeviceUDID);
}

async function matchingSimulator(
  devices: Device[],
  platformName: string,
  simulator: string | undefined,
  udid: string | undefined
) {
  return platformName === 'ios'
    ? await getFallbackSimulator(simulator, udid)
    : devices[0];
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
  if (args.device && args.udid) {
    logger.error(
      'The "--device" and "--udid" flags are mutually exclusive. Please use only one of them.'
    );
    process.exit(1);
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
}
