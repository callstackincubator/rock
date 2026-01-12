import { logger, RockError, spawn, type SubprocessError } from '@rock-js/tools';
import { getAdbPath } from './adb.js';
import type { DeviceData } from './listAndroidDevices.js';
import type { AndroidProject, Flags } from './runAndroid.js';
import { tryRunAdbReverse } from './tryRunAdbReverse.js';

export async function tryLaunchAppOnDevice(
  device: DeviceData,
  androidProject: AndroidProject,
  args: Flags,
) {
  let deviceId;
  if (!device.deviceId) {
    logger.debug(`No "deviceId" for ${device}, skipping launching the app`);
    return {};
  } else {
    deviceId = device.deviceId;
  }
  await tryRunAdbReverse(args.port, deviceId);
  const { appId, appIdSuffix } = args;
  const { packageName, mainActivity, applicationId } = androidProject;

  const applicationIdWithSuffix = [appId || applicationId, appIdSuffix]
    .filter(Boolean)
    .join('.');

  const activity = args.mainActivity ?? mainActivity;

  const activityToLaunch =
    activity.startsWith(packageName) ||
    (!activity.startsWith('.') && activity.includes('.'))
      ? activity
      : activity.startsWith('.')
        ? [packageName, activity].join('')
        : [packageName, activity].filter(Boolean).join('.');

  // Here we're using the same flags as Android Studio to launch the app
  const adbArgs = [
    'shell',
    'am',
    'start',
    '-n',
    `${applicationIdWithSuffix}/${activityToLaunch}`,
    '-a',
    'android.intent.action.MAIN',
    '-c',
    'android.intent.category.LAUNCHER',
  ];

  adbArgs.unshift('-s', deviceId);

  const adbPath = getAdbPath();
  logger.debug(`Running ${adbPath} ${adbArgs.join(' ')}.`);
  try {
    await spawn(adbPath, adbArgs);
  } catch (error) {
    throw new RockError(`Failed to launch the app on ${device.readableName}`, {
      cause: (error as SubprocessError).stderr,
    });
  }
  return { applicationIdWithSuffix };
}
