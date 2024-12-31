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

  intro('Native Fingerprint');

  const loader = spinner();
  loader.start("Calculating fingerprint for the project's native parts");

  const start = performance.now();
  const fingerprint = await nativeFingerprint(path, { platform });
  const duration = performance.now() - start;

  loader.stop(`Fingerprint calculated: ${fingerprint.hash}`);
  if (logger.isVerbose()) {
    logger.debug('Sources:', JSON.stringify(fingerprint.sources, null, 2));
    logger.debug(`Duration: ${(duration / 1000).toFixed(1)}s`);
  }

  outro('Success 🎉.');
}
