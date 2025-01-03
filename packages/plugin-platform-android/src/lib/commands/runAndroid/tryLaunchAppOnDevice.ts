import { spinner } from '@clack/prompts';
import { logger, RnefError } from '@rnef/tools';
import spawn from 'nano-spawn';
import { getAdbPath } from './adb.js';
import { DeviceData } from './listAndroidDevices.js';
import { AndroidProject, Flags } from './runAndroid.js';
import { tryRunAdbReverse } from './tryRunAdbReverse.js';

export async function tryLaunchAppOnDevice(
  device: DeviceData,
  androidProject: AndroidProject,
  args: Flags
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
  const loader = spinner();
  loader.start(
    `Installing the app on ${device.readableName} (id: ${deviceId})`
  );
  const { stderr } = await spawn(adbPath, adbArgs, {
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  loader.stop(
    `Launched the app on ${device.readableName} (id: ${deviceId}) and listening on port ${args.port}.`
  );

  if (stderr) {
    throw new RnefError(`Failed to launch the app on "${deviceId}"`, {
      cause: stderr,
    });
  }
}
