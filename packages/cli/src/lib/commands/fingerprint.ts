import { performance } from 'perf_hooks';
import {
  logger,
  nativeFingerprint,
  resolveAbsolutePath,
} from '@callstack/rnef-tools';

type NativeFingerprintCommandOptions = {
  platform: 'ios' | 'android';
};

export async function nativeFingerprintCommand(
  path = '.',
  options?: NativeFingerprintCommandOptions
) {
  path = path ?? '.';
  const platform = options?.platform ?? 'ios';

  if (logger.isVerbose()) {
    logger.debug(`Fingerprinting "${resolveAbsolutePath(path)}"...`);
  }

  const start = performance.now();
  const fingerprint = await nativeFingerprint(path, { platform });

  if (!logger.isVerbose()) {
    logger.info(fingerprint.hash);
    return;
  }

  const duration = performance.now() - start;
  logger.debug('Hash:', fingerprint.hash);
  logger.debug('Sources:', JSON.stringify(fingerprint.sources, null, 2));
  logger.debug(`Duration: ${(duration / 1000).toFixed(1)}s`);
}
