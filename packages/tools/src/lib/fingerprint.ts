import crypto from 'node:crypto';
import fs from 'node:fs';
import type { FingerprintSource } from '@expo/fingerprint';
import { createFingerprintAsync } from '@expo/fingerprint';
import glob from 'fast-glob';
import { RnefError } from './error.js';
import logger from './logger.js';

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

  const fingerprint = await createFingerprintAsync(path, {
    platforms: [platform],
    dirExcludes: [
      'android/build',
      'android/**/build',
      'android/**/.cxx',
      'ios/DerivedData',
      'ios/Pods',
      'node_modules',
      'android/local.properties',
      'android/.idea',
      'android/.gradle'
    ],
    extraSources: (await Promise.all(options.extraSources.map(async (source) => {
      if (glob.isDynamicPattern(source)) {
        let matches: string[] = [];
        try {
          matches = await glob(source, { dot: true, onlyFiles: false });
          if (matches.length === 0) {
            logger.debug(`No files found matching glob pattern: ${source}`);
          }
        } catch (error) {
          logger.debug(`Error processing glob pattern ${source}: ${error}`);
          return [];
        }

        return matches.map(matchedPath => {
          try {
            const stats = fs.statSync(matchedPath);
            if (stats.isDirectory()) {
              return {
                type: 'dir' as const,
                filePath: matchedPath,
                reasons: ['custom-user-config'],
              };
            }

            return {
              type: 'contents' as const,
              id: matchedPath,
              contents: fs.readFileSync(matchedPath, 'utf8'),
              reasons: ['custom-user-config'],
            };
          } catch (error) {
            logger.debug(`Error processing file ${matchedPath}: ${error}`);
            return [];
          }
        }).flat();
      }

      try {
        if (!fs.existsSync(source)) {
          logger.warn(`Source file or directory does not exist: ${source}`);
          return [];
        }

        const stats = fs.statSync(source);
        if (stats.isDirectory()) {
          return [{
            type: 'dir' as const,
            filePath: source,
            reasons: ['custom-user-config'],
          }];
        }
        
        return [{
          type: 'contents' as const,
          id: source,
          contents: fs.readFileSync(source, 'utf8'),
          reasons: ['custom-user-config'],
        }];
      } catch (error) {
        logger.debug(`Error processing source ${source}: ${error}`);
        return [];
      }
    }))).flat(),
    ignorePaths: options.ignorePaths
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
