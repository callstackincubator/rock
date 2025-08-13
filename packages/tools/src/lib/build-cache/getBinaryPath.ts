import { color, colorLink } from '../color.js';
import type { RockError } from '../error.js';
import {
  DEFAULT_IGNORE_PATHS,
  EXPO_DEFAULT_IGNORE_PATHS,
  type FingerprintSources,
} from '../fingerprint/index.js';
import logger from '../logger.js';
import { spawn } from '../spawn.js';
import type { RemoteBuildCache } from './common.js';
import { fetchCachedBuild } from './fetchCachedBuild.js';
import { getLocalBuildCacheBinaryPath } from './localBuildCache.js';

export async function getBinaryPath({
  artifactName,
  binaryPathFlag,
  localFlag,
  remoteCacheProvider,
  fingerprintOptions,
  sourceDir,
}: {
  artifactName: string;
  binaryPathFlag?: string;
  localFlag?: boolean;
  remoteCacheProvider: null | (() => RemoteBuildCache) | undefined;
  fingerprintOptions: FingerprintSources;
  sourceDir: string;
}) {
  // 1. First check if the binary path is provided
  let binaryPath = binaryPathFlag;

  // 2. If not, check if the local build is requested
  if (!binaryPath && !localFlag) {
    binaryPath = getLocalBuildCacheBinaryPath(artifactName);
  }

  // 3. If not, check if the remote cache is requested
  if (!binaryPath && !localFlag) {
    try {
      const cachedBuild = await fetchCachedBuild({
        artifactName,
        remoteCacheProvider,
      });
      if (cachedBuild) {
        binaryPath = cachedBuild.binaryPath;
      }
    } catch (error) {
      const message = (error as RockError).message;
      const cause = (error as RockError).cause;
      logger.warn(
        `Failed to fetch cached build for ${artifactName}: \n${message}`,
        cause ? `\nCause: ${cause.toString()}` : '',
      );
      await warnIgnoredFiles(fingerprintOptions, sourceDir);
      logger.debug('Remote cache failure error:', error);
      logger.info('Continuing with local build');
    }
  }

  return binaryPath;
}

async function warnIgnoredFiles(
  fingerprintOptions: FingerprintSources,
  sourceDir: string,
) {
  const ignorePaths = [
    ...(fingerprintOptions?.ignorePaths ?? []),
    ...EXPO_DEFAULT_IGNORE_PATHS,
    ...DEFAULT_IGNORE_PATHS,
  ];
  const { output } = await spawn('git', [
    'clean',
    '-fdx',
    '--dry-run',
    sourceDir,
    ...ignorePaths.flatMap((path) => ['-e', `${path}`]),
  ]);
  const ignoredFiles = output
    .split('\n')
    .map((line) => line.replace('Would remove ', ''))
    .filter((line) => line !== '');

  if (ignoredFiles.length > 0) {
    logger.warn(`There are files that likely affect fingerprint:
${ignoredFiles.map((file) => `- ${color.bold(file)}`).join('\n')}
Consider removing them or update ${color.bold(
      'fingerprint.ignorePaths',
    )} in ${colorLink('rock.config.mjs')}:
Read more: ${colorLink(
      'https://www.rockjs.dev/docs/configuration#fingerprint-configuration',
    )}`);
  }
}
