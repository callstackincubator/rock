import { existsSync, readdirSync } from 'node:fs';
import { logger, spawn } from '@rock-js/tools';
import { getAdbPath } from './adb.js';
import type { AndroidProject } from './runAndroid.js';

/**
 * Gradle produces following output binaries:
 * - build/outputs/apk/debug/app-debug.apk - for buildTypes.debug in install* and assemble* tasks
 * - build/outputs/bundle/release/app-release.aab - for buildTypes.release in bundle* tasks
 * - build/outputs/bundle/production/debug/app-production-debug.aab - for buildTypes.debug and flavors.production in bundle* tasks
 * - build/outputs/apk/customBuildType/app-customBuildType.apk - for buildTypes.customBuildType in install* and assemble* tasks
 */
export async function findOutputFile(
  androidProject: AndroidProject,
  tasks: string[],
  device?: string,
) {
  const { appName, sourceDir } = androidProject;
  const selectedTask = tasks.find(
    (t) =>
      t.startsWith('install') ||
      t.startsWith('assemble') ||
      t.startsWith('bundle'),
  );
  if (!selectedTask) {
    return false;
  }
  // handle if selected task includes build flavour as well, eg. installProductionDebug should create ['production','debug'] array
  const variantFromBuildTypeAndFlavor = selectedTask
    ?.replace('install', '')
    ?.replace('assemble', '')
    ?.replace('bundle', '')
    .split(/(?=[A-Z])/);

  const apkOrBundle = selectedTask?.includes('bundle') ? 'bundle' : 'apk';
  // create path to output file, eg. `production/debug`
  const variantPath = variantFromBuildTypeAndFlavor?.join('/')?.toLowerCase();
  // create output file name, eg. `production-debug`
  let variant = variantFromBuildTypeAndFlavor?.join('-')?.toLowerCase();
  let buildDirectory = `${sourceDir}/${appName}/build/outputs/${apkOrBundle}/${variantPath}`;

  if (!existsSync(buildDirectory)) {
    // default "debug" nor "release" build type or flavor is not found. fallback to searching for buildTypes that might be named with pascalCase
    const buildTypeVariant = variantFromBuildTypeAndFlavor;
    buildTypeVariant[0] = buildTypeVariant[0]?.toLowerCase();
    const variantPath = buildTypeVariant?.join('');
    variant = buildTypeVariant?.join('');
    buildDirectory = `${sourceDir}/${appName}/build/outputs/${apkOrBundle}/${variantPath}`;
  }
  const outputFile = await getInstallOutputFileName(
    appName,
    variant,
    buildDirectory,
    apkOrBundle === 'apk' ? 'apk' : 'aab',
    device,
  );
  return outputFile ? `${buildDirectory}/${outputFile}` : undefined;
}

export async function getInstallOutputFileName(
  appName: string,
  variant: string,
  buildDirectory: string,
  apkOrAab: 'apk' | 'aab',
  device: string | undefined,
) {
  const availableCPUs = await getAvailableCPUs(device);

  // check if there is an apk file like app-armeabi-v7a-debug.apk
  for (const availableCPU of availableCPUs.concat('universal')) {
    const outputFile = `${appName}-${availableCPU}-${variant}.${apkOrAab}`;
    if (existsSync(`${buildDirectory}/${outputFile}`)) {
      return outputFile;
    }
  }

  // check if there is a default file like app-debug.apk
  const outputFile = `${appName}-${variant}.${apkOrAab}`;
  if (existsSync(`${buildDirectory}/${outputFile}`)) {
    return outputFile;
  }

  // Fallback for hybrid/brownfield apps where appName may be empty.
  // appName comes from CLI's getAppName() which returns '' if neither
  // userConfigAppName nor 'app' subfolder exists in sourceDir.
  // In this case, Gradle uses the root project name as prefix
  // (e.g., HybridApp-debug.apk instead of app-debug.apk).
  // See: https://github.com/react-native-community/cli/blob/main/packages/cli-config-android/src/config/index.ts
  if (existsSync(buildDirectory)) {
    const pattern = `-${variant}.${apkOrAab}`;
    const files = readdirSync(buildDirectory);
    const matchingFile = files?.find((file) => file.endsWith(pattern));
    if (matchingFile) {
      return matchingFile;
    }
  }

  logger.debug('Could not find the output file:', {
    buildDirectory,
    outputFile,
    appName,
    variant,
    apkOrAab,
  });

  return undefined;
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

    const { output } = await spawn(adbPath, adbArgs, { stdio: 'pipe' });

    return output.trim().split(',');
  } catch {
    return [];
  }
}
