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
import { tryRunAdbReverse } from './tryRunAdbReverse.js';
import tryLaunchAppOnDevice from './tryLaunchAppOnDevice.js';
import tryInstallAppOnDevice from './tryInstallAppOnDevice.js';
import {
  link,
  getDefaultUserTerminal,
} from '@react-native-community/cli-tools';
import { getAndroidProject } from '@react-native-community/cli-config-android';
import listAndroidDevices from './listAndroidDevices.js';
import tryLaunchEmulator from './tryLaunchEmulator.js';
import path from 'path';
import { BuildFlags, options } from '../buildAndroid/index.js';
import { promptForTaskSelection } from '../buildAndroid/listAndroidTasks.js';
import { checkUsers, promptForUser } from './listAndroidUsers.js';
import { runGradle } from '../runGradle.js';

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

const defaultPort = 5552;
async function getAvailableDevicePort(
  port: number = defaultPort
): Promise<number> {
  /**
   * The default value is 5554 for the first virtual device instance running on your machine. A virtual device normally occupies a pair of adjacent ports: a console port and an adb port. The console of the first virtual device running on a particular machine uses console port 5554 and adb port 5555. Subsequent instances use port numbers increasing by two. For example, 5556/5557, 5558/5559, and so on. The range is 5554 to 5682, allowing for 64 concurrent virtual devices.
   */
  const devices = getDevices();
  if (port > 5682) {
    throw new Error('Failed to launch emulator...');
  }
  if (devices.some((d) => d.includes(port.toString()))) {
    return await getAvailableDevicePort(port + 2);
  }
  return port;
}

// Builds the app and runs it on a connected emulator / device.
async function buildAndRun(args: Flags, androidProject: AndroidProject) {
  let deviceId = args.device;
  let selectedTask: string | undefined;

  if (args.interactive) {
    selectedTask = await promptForTaskSelection(
      'install',
      androidProject.sourceDir
    );

    const device = await listAndroidDevices();
    if (!device) {
      throw new Error(
        `Failed to select device, please try to run app without "--interactive" flag.`
      );
    }

    deviceId = device.deviceId;

    if (args.interactive) {
      const users = await checkUsers(device.deviceId as string);
      if (users && users.length > 1) {
        const user = await promptForUser(users);

        if (user) {
          args.user = user.id;
        }
      }
    }

    if (!device.connected) {
      const port = await getAvailableDevicePort();
      await tryLaunchEmulator(device.readableName, port);
    }
  }

  let devices = getDevices();

  if (devices.length === 0) {
    const port = await getAvailableDevicePort();
    await tryLaunchEmulator(undefined, port);
    devices = getDevices();
  }

  return installAndLaunchOnAllDevices(
    args,
    androidProject,
    selectedTask,
    devices,
    deviceId
  );
}

async function installAndLaunchOnAllDevices(
  args: Flags,
  androidProject: AndroidProject,
  selectedTask: string | undefined,
  devices: string[],
  deviceId: string | undefined
) {
  if (!args.binaryPath) {
    await runGradle({
      taskType: 'install',
      androidProject,
      args,
      selectedTask,
    });
  }

  const devicesToInstallTo = deviceId ? [deviceId] : devices;

  devicesToInstallTo.forEach(async (device) => {
    await installAndLaunchOnDevice(device, androidProject, args, selectedTask);
  });
}

async function installAndLaunchOnDevice(
  device: string,
  androidProject: AndroidProject,
  args: Flags,
  selectedTask?: string
) {
  tryRunAdbReverse(args.port, device);
  await tryInstallAppOnDevice(device, androidProject, args, selectedTask);
  await tryLaunchAppOnDevice(device, androidProject, args);
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
