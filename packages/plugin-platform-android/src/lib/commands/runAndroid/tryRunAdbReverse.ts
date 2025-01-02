import spawn from 'nano-spawn';
import { getAdbPath } from './adb.js';
import { logger, RnefError } from '@rnef/tools';

// Runs ADB reverse tcp:8081 tcp:8081 to allow loading the jsbundle from the packager
export async function tryRunAdbReverse(
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
    await spawn(adbPath, adbArgs, { stdio: ['ignore', 'ignore', 'inherit'] });
  } catch (error) {
    throw new RnefError(
      `Failed to connect "${device}" to development server using "adb reverse"`,
      { cause: error }
    );
  }
}
