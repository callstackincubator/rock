import type { SubprocessError } from '@rock-js/tools';
import { logger, RockError, spawn } from '@rock-js/tools';
import { getAdbPath } from './adb.js';

// Runs ADB reverse tcp:8081 tcp:8081 to allow loading the jsbundle from the packager
export async function tryRunAdbReverse(
  packagerPort: number | string,
  device: string,
) {
  try {
    const adbPath = getAdbPath();
    const adbArgs = [
      '-s',
      device,
      'reverse',
      `tcp:${packagerPort}`,
      `tcp:${packagerPort}`,
    ];

    logger.debug(`Connecting "${device}" to the development server`);
    await spawn(adbPath, adbArgs);
  } catch (error) {
    throw new RockError(
      `Failed to connect "${device}" to development server using "adb reverse"`,
      { cause: (error as SubprocessError).stderr },
    );
  }
}
