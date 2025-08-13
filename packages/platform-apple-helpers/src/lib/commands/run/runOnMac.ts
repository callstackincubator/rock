import type { SubprocessError } from '@rock-js/tools';
import { color, logger, RockError, spawn } from '@rock-js/tools';

export async function runOnMac(binaryPath: string) {
  logger.debug(`Opening "${color.bold(binaryPath)}"`);

  try {
    await spawn('open', [binaryPath]);
  } catch (error) {
    throw new RockError('Failed to launch the app', {
      cause: (error as SubprocessError).stderr,
    });
  }
}
