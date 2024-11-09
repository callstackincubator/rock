/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import chalk from 'chalk';
import spawn from 'nano-spawn';
import { Config } from '@react-native-community/cli-types';
import {
  link,
  logger,
  printRunDoctorTip,
} from '@react-native-community/cli-tools';
import { getCPU, getDevices } from './adb.js';
import { tryRunAdbReverse } from './tryRunAdbReverse.js';
import tryLaunchAppOnDevice from './tryLaunchAppOnDevice.js';
import tryLaunchEmulator from './tryLaunchEmulator.js';
import tryInstallAppOnDevice from './tryInstallAppOnDevice.js';
import { getTaskNames } from './getTaskNames.js';
import type { Flags } from './index.js';
import { spinner } from '@clack/prompts';

type AndroidProject = NonNullable<Config['project']['android']>;

async function runOnAllDevices(
  args: Flags,
  cmd: string,
  androidProject: AndroidProject
) {
  let devices = getDevices();
  if (devices.length === 0) {
    try {
      await tryLaunchEmulator();
      devices = getDevices();
    } catch {
      logger.warn(
        'Please launch an emulator manually or connect a device. Otherwise app may fail to launch.'
      );
    }
  }

  const loader = spinner();
  try {
    if (!args.binaryPath) {
      const gradleArgs = getTaskNames(
        androidProject.appName,
        args.mode,
        args.tasks,
        'install'
      );

      if (args.extraParams) {
        gradleArgs.push(...args.extraParams);
      }

      if (args.port != null) {
        gradleArgs.push('-PreactNativeDevServerPort=' + args.port);
      }

      if (args.activeArchOnly) {
        const architectures = devices
          .map((device) => {
            return getCPU(device);
          })
          .filter(
            (arch, index, array) =>
              arch != null && array.indexOf(arch) === index
          );

        if (architectures.length > 0) {
          logger.info(`Detected architectures ${architectures.join(', ')}`);
          gradleArgs.push(
            '-PreactNativeArchitectures=' + architectures.join(',')
          );
        }
      }

      loader.start('Installing the app');
      await spawn(cmd, gradleArgs, {
        stdio: ['inherit', 'inherit', 'pipe'],
        cwd: androidProject.sourceDir,
      });
      loader.stop('Installed the app.');
    }
  } catch (error) {
    printRunDoctorTip();
    loader.stop(createInstallError(error as Error & { stderr: string }), 1);
  }

  (devices.length > 0 ? devices : [undefined]).forEach(
    async (device: string | void) => {
      tryRunAdbReverse(args.port, device);
      if (args.binaryPath && device) {
        await tryInstallAppOnDevice(args, device, androidProject);
      }
      await tryLaunchAppOnDevice(device, androidProject, args);
    }
  );
}

function createInstallError(error: Error & { stderr: string }) {
  const stderr = (error.stderr || '').toString();
  let message = '';
  // Pass the error message from the command to stdout because we pipe it to
  // parent process so it's not visible

  // Handle some common failures and make the errors more helpful
  if (stderr.includes('No connected devices')) {
    message =
      'Make sure you have an Android emulator running or a device connected.';
  } else if (
    stderr.includes('licences have not been accepted') ||
    stderr.includes('accept the SDK license')
  ) {
    message = `Please accept all necessary Android SDK licenses using Android SDK Manager: "${chalk.bold(
      '$ANDROID_HOME/tools/bin/sdkmanager --licenses'
    )}."`;
  } else if (stderr.includes('requires Java')) {
    message = `Looks like your Android environment is not properly set. Please go to ${chalk.dim.underline(
      link.docs('environment-setup', 'android', {
        hash: 'jdk-studio',
        guide: 'native',
      })
    )} and follow the React Native CLI QuickStart guide to install the compatible version of JDK.`;
  } else if (
    stderr.includes('INSTALL_FAILED_INSUFFICIENT_STORAGE') ||
    stderr.includes('Requested internal only, but not enough space')
  ) {
    message =
      'The device is out of space. Increase storage or remove apps and try again.';
  } else {
    message = error.message;
    logger.log(stderr);
  }

  return `Failed to install the app. ${message}`;
}

export default runOnAllDevices;
