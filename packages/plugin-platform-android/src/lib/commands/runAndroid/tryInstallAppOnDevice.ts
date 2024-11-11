import spawn from 'nano-spawn';
import fs from 'fs';
import { getAdbPath, getAvailableCPUs } from '../buildAndroid/adb.js';
import type { AndroidProject, Flags } from './index.js';
import { spinner } from '@clack/prompts';

async function tryInstallAppOnDevice(
  device: string,
  androidProject: AndroidProject,
  args: Flags,
  selectedTask?: string
) {
  const loader = spinner();

  // "app" is usually the default value for Android apps with only 1 app
  const { appName, sourceDir } = androidProject;

  const defaultVariant = (args.mode || 'debug').toLowerCase();

  // handle if selected task from interactive mode includes build flavour as well, eg. installProductionDebug should create ['production','debug'] array
  const variantFromSelectedTask = selectedTask
    ?.replace('install', '')
    .split(/(?=[A-Z])/);

  // create path to output file, eg. `production/debug`
  const variantPath =
    variantFromSelectedTask?.join('/')?.toLowerCase() ?? defaultVariant;
  // create output file name, eg. `production-debug`
  const variantAppName =
    variantFromSelectedTask?.join('-')?.toLowerCase() ?? defaultVariant;

  let pathToApk;
  if (!args.binaryPath) {
    const buildDirectory = `${sourceDir}/${appName}/build/outputs/apk/${variantPath}`;
    const apkFile = getInstallApkName(
      appName,
      variantAppName,
      device,
      buildDirectory
    );
    pathToApk = `${buildDirectory}/${apkFile}`;
  } else {
    pathToApk = args.binaryPath;
  }

  const adbArgs = ['-s', device, 'install', '-r', '-d'];

  if (args.user !== undefined) {
    adbArgs.push('--user', `${args.user}`);
  }
  
  adbArgs.push(pathToApk);

  const adbPath = getAdbPath();
  loader.start(`Installing the app on "${device}"...`);
  const { stderr } = await spawn(adbPath, adbArgs, {
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  if (stderr) {
    loader.stop(`Failed to install the app on "${device}": ${stderr}.`, 1);
  } else {
    loader.stop(`Installed the app on "${device}".`);
  }
}

function getInstallApkName(
  appName: string,
  variant: string,
  device: string,
  buildDirectory: string
) {
  const availableCPUs = getAvailableCPUs(device);

  // check if there is an apk file like app-armeabi-v7a-debug.apk
  for (const availableCPU of availableCPUs.concat('universal')) {
    const apkName = `${appName}-${availableCPU}-${variant}.apk`;
    if (fs.existsSync(`${buildDirectory}/${apkName}`)) {
      return apkName;
    }
  }

  // check if there is a default file like app-debug.apk
  const apkName = `${appName}-${variant}.apk`;
  if (fs.existsSync(`${buildDirectory}/${apkName}`)) {
    return apkName;
  }

  throw new Error('Could not find the correct install APK file.');
}

export default tryInstallAppOnDevice;
