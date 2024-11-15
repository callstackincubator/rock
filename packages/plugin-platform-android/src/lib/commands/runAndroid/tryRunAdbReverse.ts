import { execFileSync } from 'child_process';
import { getAdbPath } from './adb.js';
import { logger } from '@callstack/rnef-tools';

// Runs ADB reverse tcp:8081 tcp:8081 to allow loading the jsbundle from the packager
export function tryRunAdbReverse(
  packagerPort: number | string,
  device?: string | void
) {
  try {
    const adbPath = getAdbPath();
    const adbArgs = ['reverse', `tcp:${packagerPort}`, `tcp:${packagerPort}`];

    // If a device is specified then tell adb to use it
    if (device) {
      adbArgs.unshift('-s', device);
    }

    logger.debug(`Connecting "${device}" to the development server`);
    execFileSync(adbPath, adbArgs, { stdio: ['ignore', 'ignore', 'inherit'] });
  } catch (e) {
    logger.error(
      `Failed to connect "${device}" to development server using "adb reverse": ${
        (e as { message: string }).message
      }`
    );
  }
}
