import { createFingerprintAsync } from '@expo/fingerprint';

type FingerprintOptions = {
  platform: 'ios' | 'android';
};

/**
 * Calculates the fingerprint of the native parts project o the project.
 */
export async function nativeFingerprint(
  path: string,
  options: FingerprintOptions
) {
  const platform = options.platform;

  const fingerprint = await createFingerprintAsync(path, {
    platforms: [platform],
    dirExcludes: [
      'android/build',
      'android/app/build',
      'android/app/.cxx',
      'ios/DerivedData',
      'ios/Pods',
      'node_modules',
    ],
  });

  return fingerprint;
}
