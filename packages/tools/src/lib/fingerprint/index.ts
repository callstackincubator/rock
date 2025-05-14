import crypto from 'node:crypto';
import type { FingerprintSource } from '@expo/fingerprint';
import { createFingerprintAsync } from '@expo/fingerprint';
import { RnefError } from '../error.js';
import { processExtraSources } from './processExtraSources.js';

const HASH_ALGORITHM = 'sha1';
const EXCLUDED_SOURCES = [
  'expoAutolinkingConfig:ios',
  'expoAutolinkingConfig:android',
];

export type FingerprintOptions = {
  platform: 'ios' | 'android';
  extraSources: string[];
  ignorePaths: string[];
};

export type FingerprintResult = {
  hash: string;
  sources: FingerprintSource[];
};

/**
 * Calculates the fingerprint of the native parts project o the project.
 */
export async function nativeFingerprint(
  path: string,
  options: FingerprintOptions
): Promise<FingerprintResult> {
  const platform = options.platform;
  console.log('platform', platform);
  const fingerprint = await createFingerprintAsync(path, {
    platforms: [platform],
    dirExcludes: [
      // @expo/fingerprint has hardcoded android/app dir, which we allow to configure with appName
      // Ref: https://github.com/expo/expo/blob/84079fa454e3498329f127b8e71fb08d2390bbd0/packages/%40expo/fingerprint/src/Options.ts#L20-L22
      'android/**/build', 
      'android/**/.cxx', 
      'android/**/.gradle', 
      'ios/DerivedData',
      'node_modules',
      'android/local.properties',
      'android/.idea',
    ],
    extraSources: processExtraSources(
      options.extraSources,
      path,
      options.ignorePaths
    ),
    ignorePaths: options.ignorePaths,
  });

  // Filter out un-relevant sources as these caused hash mismatch between local and remote builds
  const sources = fingerprint.sources.filter((source) =>
    'id' in source ? !EXCLUDED_SOURCES.includes(source.id) : true
  );

  const hash = await hashSources(sources);

  return { hash, sources };
}

async function hashSources(sources: FingerprintSource[]) {
  let input = '';
  for (const source of sources) {
    if (source.hash != null) {
      input += `${createSourceId(source)}-${source.hash}\n`;
    }
  }
  const hasher = crypto.createHash(HASH_ALGORITHM);
  hasher.update(input);
  return hasher.digest('hex');
}

function createSourceId(source: FingerprintSource) {
  switch (source.type) {
    case 'contents':
      return source.id;
    case 'file':
      return source.filePath;
    case 'dir':
      return source.filePath;
    default:
      // @ts-expect-error: we intentionally want to detect invalid types
      throw new RnefError(`Unsupported source type: ${source.type}`);
  }
}
