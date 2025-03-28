import { color, logger, RnefError, spawn } from '@rnef/tools';

export async function runOnMac(binaryPath: string) {
  logger.debug(`Opening "${color.bold(binaryPath)}"`);

  try {
    await spawn('open', [binaryPath]);
  } catch (error) {
    throw new RnefError('Failed to launch the app', { cause: error });
  }
}
