import { performance } from 'perf_hooks';
import { intro, outro, spinner } from '@clack/prompts';
import { logger, nativeFingerprint } from '@rnef/tools';

type NativeFingerprintCommandOptions = {
  platform: 'ios' | 'android';
};

export async function nativeFingerprintCommand(
  path = '.',
  options?: NativeFingerprintCommandOptions
) {
  path = path ?? '.';
  const platform = options?.platform ?? 'ios';
  const loader = spinner();

  let start = 0;
  if (logger.isVerbose()) {
    start = performance.now();
  }

  loader.start("Calculating fingerprint for the project's native parts");
  const fingerprint = await nativeFingerprint(path, { platform });

  if (logger.isVerbose()) {
    const duration = performance.now() - start;
    logger.debug('Hash:', fingerprint.hash);
    logger.debug('Sources:', JSON.stringify(fingerprint.sources, null, 2));
    logger.debug(`Duration: ${(duration / 1000).toFixed(1)}s`);
  }

  loader.stop(`Fingerprint calculated: ${fingerprint.hash}`);
  outro('Success 🎉.');

  intro('Logger');
  logger.error('Error\nSecond line');
  logger.warn('Warn\nSecond line');
  logger.info('Info\nSecond line');
  logger.log('Log\nSecond line');
  logger.debug('Debug\nSecond line');
  outro('Logger');
}
