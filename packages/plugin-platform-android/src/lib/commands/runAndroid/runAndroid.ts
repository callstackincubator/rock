import fs from 'node:fs';
import {
  AndroidProjectConfig,
  Config,
} from '@react-native-community/cli-types';
import { checkCancelPrompt, logger } from '@rnef/tools';
import { intro, outro, select } from '@clack/prompts';
import isInteractive from 'is-interactive';
import { getDevices } from './adb.js';
import { toPascalCase } from '../toPascalCase.js';
import { tryLaunchAppOnDevice } from './tryLaunchAppOnDevice.js';
import { tryInstallAppOnDevice } from './tryInstallAppOnDevice.js';
import { listAndroidDevices, DeviceData } from './listAndroidDevices.js';
import { tryLaunchEmulator } from './tryLaunchEmulator.js';
import path from 'node:path';
import { BuildFlags, options } from '../buildAndroid/buildAndroid.js';
import { promptForTaskSelection } from '../listAndroidTasks.js';
import { runGradle } from '../runGradle.js';
import { fetchCachedBuild } from './fetchCachedBuild.js';

export interface Flags extends BuildFlags {
  appId: string;
  appIdSuffix: string;
  mainActivity?: string;
  port: string;
  device?: string;
  binaryPath?: string;
  user?: string;
  remoteCache: boolean;
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
  intro('Running Android app');

  normalizeArgs(args, projectRoot);

  const { deviceId } = args.interactive
    ? await selectAndLaunchDevice()
    : { deviceId: args.device };

  const mainTaskType = deviceId ? 'assemble' : 'install';
  const tasks = args.interactive
    ? [await promptForTaskSelection(mainTaskType, androidProject.sourceDir)]
    : [...(args.tasks ?? []), `${mainTaskType}${toPascalCase(args.mode)}`];

  if (!args.binaryPath && args.remoteCache) {
    const cachedBuild = await fetchCachedBuild({ mode: args.mode });
    if (cachedBuild) {
      // @todo replace with a more generic way to pass binary path
      args.binaryPath = cachedBuild.binaryPath;
    }
  }

  if (deviceId) {
    await runGradle({ tasks, androidProject, args });
    if (!(await getDevices()).find((d) => d === deviceId)) {
      logger.error(
        `Device "${deviceId}" not found. Please run it first or use a different one.`
      );
      process.exit(1);
    }
    await tryInstallAppOnDevice(deviceId, androidProject, args, tasks);
    await tryLaunchAppOnDevice(deviceId, androidProject, args);
  } else {
    if ((await getDevices()).length === 0) {
      if (isInteractive()) {
        await selectAndLaunchDevice();
      } else {
        logger.debug(
          'No booted devices or emulators found. Launching first available emulator.'
        );
        await tryLaunchEmulator();
      }
    }

    await runGradle({ tasks, androidProject, args });

    for (const device of await getDevices()) {
      if (args.binaryPath) {
        await tryInstallAppOnDevice(device, androidProject, args, tasks);
      }
      await tryLaunchAppOnDevice(device, androidProject, args);
    }
  }
  outro('Success 🎉.');
}

async function selectAndLaunchDevice() {
  const allDevices = await listAndroidDevices();
  const device = await promptForDeviceSelection(allDevices);

  if (!device) {
    throw new Error(
      `Failed to select device, please try to run app without "--interactive" flag.`
    );
  }

  if (!device.connected) {
    await tryLaunchEmulator(device.readableName);
    // list devices once again when emulator is booted
    const allDevices = await listAndroidDevices();
    const newDevice =
      allDevices.find((d) => d.readableName === device.readableName) ?? device;
    return newDevice;
  }
  return device;
}

function normalizeArgs(args: Flags, projectRoot: string) {
  if (args.tasks && args.mode) {
    logger.warn(
      'Both "--tasks" and "--mode" parameters were passed. Using "--tasks" for building the app.'
    );
  }

  if (!args.mode) {
    args.mode = 'debug';
  }

  // turn on activeArchOnly for debug to speed up local builds
  if (args.mode !== 'release' && args.activeArchOnly === undefined) {
    args.activeArchOnly = true;
  }

  if (args.binaryPath) {
    if (args.tasks) {
      throw new Error(
        'Both "--binary-path" and "--tasks" flags were specified, which are incompatible. Please specify only one.'
      );
    }

    args.binaryPath = path.isAbsolute(args.binaryPath)
      ? args.binaryPath
      : path.join(projectRoot, args.binaryPath);

    if (args.binaryPath && !fs.existsSync(args.binaryPath)) {
      throw new Error(
        `"--binary-path" was specified, but the file was not found at "${args.binaryPath}".`
      );
    }
  }
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
        label: `${d.readableName}${
          d.type === 'phone' ? ' - (physical device)' : ''
        }${d.connected ? ' (connected)' : ''}`,
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
  {
    name: '--no-remote-cache',
    description: 'Do not use remote build cacheing.',
  },
];
