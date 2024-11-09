/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import spawn from 'nano-spawn';
import { AndroidProject, Flags } from './index.js';
import { getAdbPath } from './adb.js';
import { spinner } from '@clack/prompts';

async function tryLaunchAppOnDevice(
  device: string | void,
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
  try {
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

    if (device) {
      adbArgs.unshift('-s', device);
      loader.start(`Starting the app on "${device}"...`);
    } else {
      loader.start('Starting the app...');
    }
    const adbPath = getAdbPath();
    await spawn(adbPath, adbArgs);
    loader.stop('App started.');
  } catch (error) {
    loader.stop(
      `Failed to start the app. ${(error as { message: string }).message}`,
      1
    );
  }
}

export default tryLaunchAppOnDevice;
