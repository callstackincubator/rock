import spawn from 'nano-spawn';
import { AndroidProject, Flags } from './runAndroid.js';
import { getAdbPath } from './adb.js';
import { spinner } from '@clack/prompts';

async function tryLaunchAppOnDevice(
  device: string,
  androidProject: AndroidProject,
  args: Flags
) {
  const { appId, appIdSuffix } = args;

  const { packageName, mainActivity, applicationId } = androidProject;

  const applicationIdWithSuffix = [appId || applicationId, appIdSuffix]
    .filter(Boolean)
    .join('.');

  const activityToLaunch =
    mainActivity.startsWith(packageName) ||
    (!mainActivity.startsWith('.') && mainActivity.includes('.'))
      ? mainActivity
      : mainActivity.startsWith('.')
      ? [packageName, mainActivity].join('')
      : [packageName, mainActivity].filter(Boolean).join('.');

  const loader = spinner();

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

  adbArgs.unshift('-s', device);

  loader.start(`Launching the app on "${device}"...`);
  const adbPath = getAdbPath();
  const { stderr } = await spawn(adbPath, adbArgs, {
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  if (stderr) {
    loader.stop(`Failed to launch the app on "${device}". ${stderr}`, 1);
  } else {
    loader.stop(`Launched the app on "${device}".`);
  }
}

export default tryLaunchAppOnDevice;
