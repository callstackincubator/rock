/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import fs from 'fs';
import { Config } from '@react-native-community/cli-types';
import { getDevices } from '../buildAndroid/adb.js';
import { toPascalCase } from '../buildAndroid/toPascalCase.js';
import { tryRunAdbReverse } from './tryRunAdbReverse.js';
import tryLaunchAppOnDevice from './tryLaunchAppOnDevice.js';
import tryInstallAppOnDevice from './tryInstallAppOnDevice.js';
import {
  link,
  getDefaultUserTerminal,
} from '@react-native-community/cli-tools';
import { getAndroidProject } from '@react-native-community/cli-config-android';
import { listAndroidDevices, DeviceData } from './listAndroidDevices.js';
import tryLaunchEmulator from './tryLaunchEmulator.js';
import path from 'path';
import { BuildFlags, options } from '../buildAndroid/index.js';
import { promptForTaskSelection } from '../buildAndroid/listAndroidTasks.js';
import { checkUsers, promptForUser } from './listAndroidUsers.js';
import { runGradle } from '../runGradle.js';
import { select } from '@clack/prompts';
import chalk from 'chalk';

export interface Flags extends BuildFlags {
  appId: string;
  appIdSuffix: string;
  mainActivity?: string;
  port: string;
  terminal?: string;
  packager?: boolean;
  device?: string;
  binaryPath?: string;
  user?: string;
}

export type AndroidProject = NonNullable<Config['project']['android']>;

/**
 * Starts the app on a connected Android emulator or device.
 */
export async function runAndroid(config: Config, args: Flags) {
  link.setPlatform('android');

  if (config.reactNativeVersion !== 'unknown') {
    link.setVersion(config.reactNativeVersion);
  }

  if (args.binaryPath) {
    if (args.tasks) {
      throw new Error(
        'binary-path and tasks were specified, but they are not compatible. Specify only one.'
      );
    }

    args.binaryPath = path.isAbsolute(args.binaryPath)
      ? args.binaryPath
      : path.join(config.root, args.binaryPath);

    if (args.binaryPath && !fs.existsSync(args.binaryPath)) {
      throw new Error('binary-path was specified, but the file was not found.');
    }
  }

  const androidProject = getAndroidProject(config);

  if (args.mainActivity) {
    androidProject.mainActivity = args.mainActivity;
  }

  return buildAndRun(args, androidProject);
}

// Builds the app and runs it on a connected emulator / device.
async function buildAndRun(args: Flags, androidProject: AndroidProject) {
  let deviceId = args.device;
  let selectedTask: string | undefined;
  let devices = getDevices();

  if (args.interactive) {
    selectedTask = await promptForTaskSelection(
      'install',
      androidProject.sourceDir
    );

    const allDevices = await listAndroidDevices();
    const device = await promptForDeviceSelection(allDevices);

    if (!device) {
      throw new Error(
        `Failed to select device, please try to run app without "--interactive" flag.`
      );
    }

    deviceId = device.deviceId;

    if (!device.connected) {
      await tryLaunchEmulator(device.readableName);
      // list devices once again when emulator is booted
      const allDevices = await listAndroidDevices();
      const newDevice =
        allDevices.find((d) => d.readableName === device.readableName) ??
        device;
      deviceId = newDevice.deviceId;
    }

    if (deviceId) {
      const users = await checkUsers(deviceId);
      if (users && users.length > 1) {
        const user = await promptForUser(users);

        if (user) {
          args.user = user.id;
        }
      }
    }
  }

  if (devices.length === 0) {
    await tryLaunchEmulator(undefined);
    devices = getDevices();
  }

  if (!args.binaryPath) {
    await runGradle({
      taskType: 'install',
      androidProject,
      args,
      selectedTask,
    });
  }

  return installAndLaunchOnAllDevices(
    args,
    androidProject,
    selectedTask,
    deviceId ? [deviceId] : devices
  );
}

async function installAndLaunchOnAllDevices(
  args: Flags,
  androidProject: AndroidProject,
  selectedTask: string | undefined,
  devices: string[]
) {
  return devices.forEach(async (device) => {
    tryRunAdbReverse(args.port, device);
    await tryInstallAppOnDevice(device, androidProject, args, selectedTask);
    await tryLaunchAppOnDevice(device, androidProject, args);
  });
}

async function promptForDeviceSelection(
  allDevices: Array<DeviceData>
): Promise<DeviceData> {
  if (!allDevices.length) {
    throw new Error(
      'No devices and/or emulators connected. Please create emulator with Android Studio or connect Android device.'
    );
  }
  const selected = (await select({
    message: 'Select the device / emulator you want to use',
    options: allDevices.map((d) => ({
      label: `${chalk.bold(`${toPascalCase(d.type)}`)} ${chalk.green(
        `${d.readableName}`
      )} (${d.connected ? 'connected' : 'disconnected'})`,
      value: d,
    })),
  })) as DeviceData;

  return selected;
}

export const runOptions = [
  ...options,
  {
    name: '--no-packager',
    description: 'Do not launch packager while running the app',
  },
  {
    name: '--port <number>',
    description: 'Part for packager.',
    default: process.env['RCT_METRO_PORT'] || '8081',
  },
  {
    name: '--terminal <string>',
    description:
      'Launches the Metro Bundler in a new window using the specified terminal path.',
    default: getDefaultUserTerminal(),
  },
  {
    name: '--appId <string>',
    description:
      'Specify an applicationId to launch after build. If not specified, `package` from AndroidManifest.xml will be used.',
    default: '',
  },
  {
    name: '--appIdSuffix <string>',
    description: 'Specify an applicationIdSuffix to launch after build.',
    default: '',
  },
  {
    name: '--main-activity <string>',
    description: 'Name of the activity to start',
  },
  {
    name: '--device <string>',
    description:
      'Explicitly set the device to use by name. The value is not required ' +
      'if you have a single device connected.',
  },
  {
    name: '--binary-path <string>',
    description:
      'Path relative to project root where pre-built .apk binary lives.',
  },
  {
    name: '--user <number>',
    description: 'Id of the User Profile you want to install the app on.',
  },
];

export default {
  name: 'run-android',
  description:
    'builds your app and starts it on a connected Android emulator or device',
  func: runAndroid,
  options: runOptions,
};
