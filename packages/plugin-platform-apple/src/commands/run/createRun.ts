/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import path from 'path';
import fs from 'fs';
import color from 'picocolors';
import { logger } from '@callstack/rnef-tools';
import listDevices from '../../utils/listDevices.js';
import { promptForDeviceSelection } from '../../utils/prompts.js';
import { buildProject } from '../build/buildProject.js';
import { getConfiguration } from '../build/getConfiguration.js';
import { getFallbackSimulator } from './getFallbackSimulator.js';
import { getPlatformInfo } from './getPlatformInfo.js';
import { printFoundDevices, matchingDevice } from './matchingDevice.js';
import { runOnDevice } from './runOnDevice.js';
import { runOnSimulator } from './runOnSimulator.js';
import {
  BuilderCommand,
  ProjectConfig,
  XcodeProjectInfo,
} from '../../types/index.js';
import openApp from './openApp.js';
import { RunFlags } from './runOptions.js';
import { selectFromInteractiveMode } from '../../utils/selectFromInteractiveMode.js';
import { spinner } from '@clack/prompts';
import { supportedPlatforms } from '../../supportedPlatforms.js';

// function getPackageJson(root: string) {
//   try {
//     return require(path.join(root, 'package.json'));
//   } catch {
//     throw new Error(
//       'No package.json found. Please make sure the file exists in the current folder.'
//     );
//   }
// }

export const createRun = async (
  platformName: BuilderCommand['platformName'],
  projectConfig: ProjectConfig,
  args: RunFlags,
  projectRoot: string
) => {
  const { sdkNames, readableName: platformReadableName } =
    getPlatformInfo(platformName);

  if (
    projectConfig === undefined ||
    supportedPlatforms[platformName] === undefined
  ) {
    throw new Error(`Unable to find ${platformReadableName} platform config`);
  }

  const { xcodeProject, sourceDir } = projectConfig;

  if (!xcodeProject) {
    logger.error(
      `Could not find Xcode project files in "${sourceDir}" folder. Please make sure that you have installed Cocoapods and "${sourceDir}" is a valid path`
    );
    process.exit(1);
  }

  normalizeArgs(args, xcodeProject);
  // @todo replace chdir with running the command in the {cwd: sourceDir}
  process.chdir(sourceDir);

  if (args.binaryPath) {
    args.binaryPath = path.isAbsolute(args.binaryPath)
      ? args.binaryPath
      : path.join(projectRoot, args.binaryPath);

    if (!fs.existsSync(args.binaryPath)) {
      throw new Error('binary-path was specified, but the file was not found.');
    }
  }

  const { scheme, mode } = args.interactive
    ? await selectFromInteractiveMode(xcodeProject, args.scheme, args.mode)
    : await getConfiguration(
        xcodeProject,
        args.scheme,
        args.mode,
        platformName
      );

  if (platformName === 'macos') {
    const buildOutput = await buildProject(
      xcodeProject,
      platformName,
      undefined,
      scheme,
      mode,
      args
    );

    await openApp({
      buildOutput,
      xcodeProject,
      mode,
      scheme,
      target: args.target,
      binaryPath: args.binaryPath,
    });

    return;
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

  // @todo implement cache manager
  // const packageJson = getPackageJson(ctx.root);

  // const preferredDevice = cacheManager.get(
  //   packageJson.name,
  //   'lastUsedIOSDeviceId'
  // );

  // if (preferredDevice) {
  //   const preferredDeviceIndex = devices.findIndex(
  //     ({ udid }) => udid === preferredDevice
  //   );

  //   if (preferredDeviceIndex > -1) {
  //     const [device] = devices.splice(preferredDeviceIndex, 1);
  //     devices.unshift(device);
  //   }
  // }

  const fallbackSimulator =
    platformName === 'ios'
      ? getFallbackSimulator(args.simulator, args.udid)
      : devices[0];

  if (args.interactive) {
    const selectedDevice = await promptForDeviceSelection(devices);

    if (!selectedDevice) {
      throw new Error(
        `Failed to select device, please try to run app without the "--interactive" flag.`
      );
    } else {
      // if (selectedDevice.udid !== preferredDevice) {
      //   cacheManager.set(
      //     packageJson.name,
      //     'lastUsedIOSDeviceId',
      //     selectedDevice.udid
      //   );
      // }
    }

    if (selectedDevice.type === 'simulator') {
      return runOnSimulator(
        xcodeProject,
        platformName,
        mode,
        scheme,
        args,
        selectedDevice
      );
    } else {
      return runOnDevice(
        selectedDevice,
        platformName,
        mode,
        scheme,
        xcodeProject,
        args
      );
    }
  }

  if (!args.device && !args.udid && !args.simulator) {
    const bootedSimulators = devices.filter(
      ({ state, type }) => state === 'Booted' && type === 'simulator'
    );
    const bootedDevices = devices.filter(({ type }) => type === 'device'); // Physical devices here are always booted
    const booted = [...bootedSimulators, ...bootedDevices];

    if (booted.length === 0) {
      logger.info(
        'No booted devices or simulators found. Launching first available simulator...'
      );
      return runOnSimulator(
        xcodeProject,
        platformName,
        mode,
        scheme,
        args,
        fallbackSimulator
      );
    }

    logger.info(`Found booted ${booted.map(({ name }) => name).join(', ')}`);

    for (const simulator of bootedSimulators) {
      await runOnSimulator(
        xcodeProject,
        platformName,
        mode,
        scheme,
        args,
        simulator || fallbackSimulator
      );
    }

    for (const device of bootedDevices) {
      await runOnDevice(device, platformName, mode, scheme, xcodeProject, args);
    }

    return;
  }

  if (args.udid) {
    const device = devices.find((d) => d.udid === args.udid);
    if (!device) {
      return logger.error(
        `Could not find a device with udid: "${color.bold(
          args.udid
        )}". ${printFoundDevices(devices)}`
      );
    }
    if (device.type === 'simulator') {
      return runOnSimulator(
        xcodeProject,
        platformName,
        mode,
        scheme,
        args,
        fallbackSimulator
      );
    } else {
      return runOnDevice(
        device,
        platformName,
        mode,
        scheme,
        xcodeProject,
        args
      );
    }
  } else if (args.device) {
    let device = matchingDevice(devices, args.device);

    if (!device) {
      const deviceByUdid = devices.find((d) => d.udid === args.device);
      if (!deviceByUdid) {
        return logger.error(
          `Could not find a physical device with name or unique device identifier: "${color.bold(
            args.device
          )}". ${printFoundDevices(devices, 'device')}`
        );
      }

      device = deviceByUdid;

      if (deviceByUdid.type === 'simulator') {
        return logger.error(
          `The device with udid: "${color.bold(
            args.device
          )}" is a simulator. If you want to run on a simulator, use the "--simulator" flag instead.`
        );
      }
    }

    if (device && device.type === 'simulator') {
      return logger.error(
        "`--device` flag is intended for physical devices. If you're trying to run on a simulator, use `--simulator` instead."
      );
    }

    if (device && device.type === 'device') {
      return runOnDevice(
        device,
        platformName,
        mode,
        scheme,
        xcodeProject,
        args
      );
    }
  } else {
    runOnSimulator(
      xcodeProject,
      platformName,
      mode,
      scheme,
      args,
      fallbackSimulator
    );
  }
};

function normalizeArgs(args: RunFlags, xcodeProject: XcodeProjectInfo) {
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
}
