/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { execFileSync } from 'child_process';
import { getAdbPath } from '../buildAndroid/adb.js';
import { spinner } from '@clack/prompts';

// Runs ADB reverse tcp:8081 tcp:8081 to allow loading the jsbundle from the packager
export function tryRunAdbReverse(
  packagerPort: number | string,
  device?: string | void
) {
  const loader = spinner();
  try {
    const adbPath = getAdbPath();
    const adbArgs = ['reverse', `tcp:${packagerPort}`, `tcp:${packagerPort}`];

    // If a device is specified then tell adb to use it
    if (device) {
      adbArgs.unshift('-s', device);
    }

    loader.start('Connecting to the development server');
    execFileSync(adbPath, adbArgs, { stdio: 'inherit' });
    loader.stop('Connected to the development server');
  } catch (e) {
    loader.stop(
      `Failed to connect to development server using "adb reverse": ${
        (e as { message: string }).message
      }`,
      1
    );
  }
}
