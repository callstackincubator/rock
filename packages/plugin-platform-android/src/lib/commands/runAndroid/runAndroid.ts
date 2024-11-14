import fs from 'fs';
import {
  AndroidProjectConfig,
  Config,
} from '@react-native-community/cli-types';
import { checkCancelPrompt } from '@callstack/rnef-tools';
import { getDevices } from './adb.js';
import { toPascalCase } from '../toPascalCase.js';
import { tryRunAdbReverse } from './tryRunAdbReverse.js';
import tryLaunchAppOnDevice from './tryLaunchAppOnDevice.js';
import tryInstallAppOnDevice from './tryInstallAppOnDevice.js';
import { listAndroidDevices, DeviceData } from './listAndroidDevices.js';
import tryLaunchEmulator from './tryLaunchEmulator.js';
import path from 'path';
import { BuildFlags, options } from '../buildAndroid/buildAndroid.js';
import { promptForTaskSelection } from '../listAndroidTasks.js';
import { promptForUser } from './listAndroidUsers.js';
import { runGradle } from '../runGradle.js';
import { select } from '@clack/prompts';
import chalk from 'chalk';

export interface Flags extends BuildFlags {
  appId: string;
  appIdSuffix: string;
  mainActivity?: string;
  port: string;
  device?: string;
  binaryPath?: string;
  user?: string;
}

export type AndroidProject = NonNullable<Config['project']['android']>;

/**
 * Starts the app on a connected Android emulator or device.
 */
export async function runAndroid(
  androidProject: AndroidProjectConfig,
  args: Flags,
  projectRoot: string
) {
  if (args.mainActivity) {
    androidProject.mainActivity = args.mainActivity;
  }

  let deviceId = args.device;
  let selectedTask: string | undefined;

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
      const user = await promptForUser(deviceId);

      if (user) {
        args.user = user.id;
      }
    }
  }

  let devices = getDevices();

  if (devices.length === 0) {
    await tryLaunchEmulator();
    devices = getDevices();
  }

  if (args.binaryPath) {
    if (args.tasks) {
      throw new Error(
        'binary-path and tasks were specified, but they are not compatible. Specify only one.'
      );
    }

    args.binaryPath = path.isAbsolute(args.binaryPath)
      ? args.binaryPath
      : path.join(projectRoot, args.binaryPath);

    if (args.binaryPath && !fs.existsSync(args.binaryPath)) {
      throw new Error('binary-path was specified, but the file was not found.');
    }
  } else {
    await runGradle({
      taskType: 'install',
      androidProject,
      args,
      selectedTask,
    });
  }

  await installAndLaunchOnAllDevices(
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
  const selected = checkCancelPrompt<DeviceData>(
    await select({
      message: 'Select the device / emulator you want to use',
      options: allDevices.map((d) => ({
        label: `${chalk.bold(`${toPascalCase(d.type)}`)} ${chalk.green(
          `${d.readableName}`
        )} (${d.connected ? 'connected' : 'disconnected'})`,
        value: d,
      })),
    })
  );

  return selected;
}

export const runOptions = [
  ...options,
  {
    name: '--port <number>',
    description: 'Part for packager.',
    default: process.env['RCT_METRO_PORT'] || '8081',
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
