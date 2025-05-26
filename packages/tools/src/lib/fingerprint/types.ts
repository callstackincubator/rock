import type { FingerprintSource, HashSource } from '@expo/fingerprint';

export type FingerprintPlatform = 'ios' | 'android';

export type FingerprintOptions = {
  platform: FingerprintPlatform;
  extraSources: string[];
  ignorePaths: string[];
};

export type FingerprintResult = {
  hash: string;
  sources: FingerprintSource[];
};

export type FingerprintPlatformSource = {
  platform: FingerprintPlatform;
  sources: HashSource[];
  dirExcludes: string[];
};
