import { performance } from 'node:perf_hooks';
import { intro, isInteractive, logger, nativeFingerprint, outro, spinner } from '@rnef/tools';

type NativeFingerprintCommandOptions = {
  platform: 'ios' | 'android';
  raw?: boolean;
};

type ConfigFingerprintOptions = {
  extraSources: string[];
  ignorePaths: string[];
};

export async function nativeFingerprintCommand(
  path = '.',
  { extraSources, ignorePaths }: ConfigFingerprintOptions,
  options?: NativeFingerprintCommandOptions
) {
  path = path ?? '.';
  const platform = options?.platform ?? 'ios';
  const readablePlatformName = platform === 'ios' ? 'iOS' : 'Android';

  if (options?.raw || !isInteractive()) {
    const fingerprint = await nativeFingerprint(path, {
      platform,
      extraSources,
      ignorePaths,
    });
    console.log(fingerprint.hash);
    return;
  }

  intro(`${readablePlatformName} Fingerprint`);

  const loader = spinner();
  loader.start("Calculating fingerprint for the project's native parts");

  const start = performance.now();
  const fingerprint = await nativeFingerprint(path, {
    platform,
    extraSources,
    ignorePaths,
  });
  const duration = performance.now() - start;

  loader.stop(`Fingerprint calculated: ${fingerprint.hash}`);

  logger.debug('Sources:', JSON.stringify(fingerprint.sources, null, 2));
  logger.debug(`Duration: ${(duration / 1000).toFixed(1)}s`);

  outro('Success 🎉.');
}
