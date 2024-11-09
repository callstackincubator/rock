/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import fs from 'fs';
import { Config } from '@react-native-community/cli-types';
import { getCPU, getDevices } from './adb.js';
import { tryRunAdbReverse } from './tryRunAdbReverse.js';
import runOnAllDevices from './runOnAllDevices.js';
import tryLaunchAppOnDevice from './tryLaunchAppOnDevice.js';
import tryInstallAppOnDevice from './tryInstallAppOnDevice.js';
import {
  logger,
  CLIError,
  link,
  getDefaultUserTerminal,
} from '@react-native-community/cli-tools';
import { getAndroidProject } from '@react-native-community/cli-config-android';
import listAndroidDevices from './listAndroidDevices.js';
import tryLaunchEmulator from './tryLaunchEmulator.js';
import path from 'path';
import { build, BuildFlags, options } from '../buildAndroid/index.js';
import { promptForTaskSelection } from './listAndroidTasks.js';
import { getTaskNames } from './getTaskNames.js';
import { checkUsers, promptForUser } from './listAndroidUsers.js';

export interface Flags extends BuildFlags {
  appId: string;
  appIdSuffix: string;
  mainActivity?: string;
  port: string;
  terminal?: string;
  packager?: boolean;
  device?: string;
  listDevices?: boolean;
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
      throw new CLIError(
        'binary-path and tasks were specified, but they are not compatible. Specify only one'
      );
    }

    args.binaryPath = path.isAbsolute(args.binaryPath)
      ? args.binaryPath
      : path.join(config.root, args.binaryPath);

    if (args.binaryPath && !fs.existsSync(args.binaryPath)) {
      throw new CLIError(
        'binary-path was specified, but the file was not found.'
      );
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
    throw new CLIError('Failed to launch emulator...');
  }
  if (devices.some((d) => d.includes(port.toString()))) {
    return await getAvailableDevicePort(port + 2);
  }
  return port;
}

// Builds the app and runs it on a connected emulator / device.
async function buildAndRun(args: Flags, androidProject: AndroidProject) {
  process.chdir(androidProject.sourceDir);
  const cmd = process.platform.startsWith('win') ? 'gradlew.bat' : './gradlew';

  let selectedTask;

  if (args.interactive) {
    const task = await promptForTaskSelection(
      'install',
      androidProject.sourceDir
    );
    if (task) {
      selectedTask = task;
    }
  }

  if (args.listDevices || args.interactive) {
    if (args.device) {
      logger.warn(
        `Both "device" and "list-devices" parameters were passed to "run" command. We will list available devices and let you choose from one`
      );
    }

    const device = await listAndroidDevices();
    if (!device) {
      throw new CLIError(
        `Failed to select device, please try to run app without ${
          args.listDevices ? 'list-devices' : 'interactive'
        } command.`
      );
    }

    if (args.interactive) {
      const users = await checkUsers(device.deviceId as string);
      if (users && users.length > 1) {
        const user = await promptForUser(users);

        if (user) {
          args.user = user.id;
        }
      }
    }

    if (device.connected) {
      return runOnSpecificDevice(
        args,
        androidProject,
        selectedTask,
        device.deviceId
      );
    }

    const port = await getAvailableDevicePort();
    await tryLaunchEmulator(device.readableName, port);
    return runOnSpecificDevice(
      args,
      androidProject,
      selectedTask,
      device.deviceId
    );
  }

  if (args.device) {
    return runOnSpecificDevice(args, androidProject, selectedTask, args.device);
  } else {
    return runOnAllDevices(args, cmd, androidProject);
  }
}

async function runOnSpecificDevice(
  args: Flags,
  androidProject: AndroidProject,
  selectedTask?: string,
  deviceId?: string
) {
  const devices = getDevices();

  // if coming from run-android command and we have selected task
  // from interactive mode we need to create appropriate build task
  // eg 'installRelease' -> 'assembleRelease'
  const buildTask = selectedTask
    ? [selectedTask.replace('install', 'assemble')]
    : [];

  if (devices.length > 0 && deviceId) {
    if (devices.indexOf(deviceId) !== -1) {
      const gradleArgs = getTaskNames(
        androidProject.appName,
        args.mode,
        args.tasks ?? buildTask,
        'install'
      );

      // using '-x lint' in order to ignore linting errors while building the apk
      gradleArgs.push('-x', 'lint');
      if (args.extraParams) {
        gradleArgs.push(...args.extraParams);
      }

      if (args.port) {
        gradleArgs.push(`-PreactNativeDevServerPort=${args.port}`);
      }

      if (args.activeArchOnly) {
        const architecture = getCPU(deviceId);

        if (architecture !== null) {
          logger.info(`Detected architecture ${architecture}`);
          gradleArgs.push(`-PreactNativeArchitectures=${architecture}`);
        }
      }

      if (!args.binaryPath) {
        build(gradleArgs, androidProject.sourceDir);
      }

      await installAndLaunchOnDevice(
        args,
        deviceId,
        androidProject,
        selectedTask
      );
    } else {
      logger.error(
        `Could not find device with the id: "${deviceId}". Please choose one of the following:`,
        ...devices
      );
    }
  } else {
    logger.error('No Android device or emulator connected.');
  }
}

async function installAndLaunchOnDevice(
  args: Flags,
  selectedDevice: string,
  androidProject: AndroidProject,
  selectedTask?: string
) {
  tryRunAdbReverse(args.port, selectedDevice);

  await tryInstallAppOnDevice(
    args,
    selectedDevice,
    androidProject,
    selectedTask
  );

  await tryLaunchAppOnDevice(selectedDevice, androidProject, args);
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
    name: '--list-devices',
    description:
      'Lists all available Android devices and simulators and let you choose one to run the app',
    default: false,
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
