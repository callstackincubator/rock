import { performance } from 'perf_hooks';
import { nativeFingerprint } from '@callstack/rnef-tools';

type NativeFingerprintCommandOptions = {
  platform?: 'ios' | 'android';
  verbose?: boolean;
};

export async function nativeFingerprintCommand(
  path?: string,
  options?: NativeFingerprintCommandOptions
) {
  if (options?.verbose) {
    console.log('Fingerprinting...');
  }

  const start = performance.now();
  const fingerprint = await nativeFingerprint(path ?? '.', {
    platform: options?.platform ?? 'ios',
  });

  if (!options?.verbose) {
    console.log(fingerprint.hash);
    return;
  }

  const duration = performance.now() - start;
  console.log('Hash: ', fingerprint.hash);
  console.log('Details: ', fingerprint.sources);
  console.log(`Duration: ${duration.toFixed(1)}ms`);
}
