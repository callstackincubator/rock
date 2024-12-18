import spawn from 'nano-spawn';
import fs from 'fs';
import { getAdbPath } from './adb.js';
import type { AndroidProject, Flags } from './runAndroid.js';
import { spinner } from '@clack/prompts';
import { promptForUser } from './listAndroidUsers.js';
import { logger, RnefError } from '@rnef/tools';
import { DeviceData } from './listAndroidDevices.js';

export async function tryInstallAppOnDevice(
  device: DeviceData,
  androidProject: AndroidProject,
  args: Flags,
  tasks: string[]
) {
  let deviceId;
  if (!device.deviceId) {
    logger.debug(
      `No device with id "${device.deviceId}", skipping launching the app.`
    );
    return;
  } else {
    deviceId = device.deviceId;
  }
  let pathToApk: string;
  if (!args.binaryPath) {
    const outputFilePath = await findOutputFile(
      androidProject,
      tasks,
      deviceId
    );
    if (!outputFilePath) {
      logger.warn(
        "Skipping installation because there's no build output file."
      );
      return;
    }
    pathToApk = outputFilePath;
  } else {
    pathToApk = args.binaryPath;
  }

  const adbArgs = ['-s', deviceId, 'install', '-r', '-d'];
  const user = args.interactive
    ? (await promptForUser(deviceId))?.id
    : args.user;

  if (user !== undefined) {
    adbArgs.push('--user', `${user}`);
  }

  adbArgs.push(pathToApk);

  const adbPath = getAdbPath();
  const loader = spinner();
  loader.start(
    `Installing the app on ${device.readableName} (id: ${deviceId})`
  );
  const { stderr } = await spawn(adbPath, adbArgs, {
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  if (stderr) {
    loader.stop(
      `Failed to install the app on ${device.readableName} (id: ${deviceId}): ${stderr}.`,
      1
    );
  } else {
    loader.stop(
      `Installed the app on ${device.readableName} (id: ${deviceId}).`
    );
  }
}

export async function findOutputFile(
  androidProject: AndroidProject,
  tasks: string[],
  device?: string
) {
  const { appName, sourceDir } = androidProject;
  const selectedTask = tasks.find(
    (t) =>
      t.startsWith('install') ||
      t.startsWith('assemble') ||
      t.startsWith('bundle')
  );
  if (!selectedTask) {
    return false;
  }
  // handle if selected task from interactive mode includes build flavour as well, eg. installProductionDebug should create ['production','debug'] array
  const variantFromSelectedTask = selectedTask
    ?.replace('install', '')
    ?.replace('assemble', '')
    ?.replace('bundle', '')
    .split(/(?=[A-Z])/);

  // create path to output file, eg. `production/debug`
  const variantPath = variantFromSelectedTask?.join('/')?.toLowerCase();
  // create output file name, eg. `production-debug`
  const variantAppName = variantFromSelectedTask?.join('-')?.toLowerCase();
  const apkOrBundle = selectedTask?.includes('bundle') ? 'bundle' : 'apk';
  const buildDirectory = `${sourceDir}/${appName}/build/outputs/${apkOrBundle}/${variantPath}`;
  const outputFile = await getInstallOutputFileName(
    appName,
    variantAppName,
    buildDirectory,
    apkOrBundle === 'apk' ? 'apk' : 'aab',
    device
  );
  return `${buildDirectory}/${outputFile}`;
}

async function getInstallOutputFileName(
  appName: string,
  variant: string,
  buildDirectory: string,
  apkOrAab: 'apk' | 'aab',
  device: string | undefined
) {
  const availableCPUs = await getAvailableCPUs(device);

  // check if there is an apk file like app-armeabi-v7a-debug.apk
  for (const availableCPU of availableCPUs.concat('universal')) {
    const outputFile = `${appName}-${availableCPU}-${variant}.${apkOrAab}`;
    if (fs.existsSync(`${buildDirectory}/${outputFile}`)) {
      return outputFile;
    }
  }

  // check if there is a default file like app-debug.apk
  const outputFile = `${appName}-${variant}.${apkOrAab}`;
  if (fs.existsSync(`${buildDirectory}/${outputFile}`)) {
    return outputFile;
  }

  throw new RnefError(
    `Could not find the correct .${apkOrAab} file to install.`
  );
}

/**
 * Gets available CPUs of devices from ADB
 */
async function getAvailableCPUs(device?: string) {
  const adbPath = getAdbPath();
  try {
    const adbArgs = ['shell', 'getprop', 'ro.product.cpu.abilist'];

    if (device) {
      adbArgs.unshift('-s', device);
    }

    const { output } = await spawn(adbPath, adbArgs);

    return output.trim().split(',');
  } catch {
    return [];
  }
}
