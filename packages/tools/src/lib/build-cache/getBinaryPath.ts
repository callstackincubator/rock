import type { RnefError } from '../error.js';
import logger from '../logger.js';
import type { RemoteBuildCache } from './common.js';
import { fetchCachedBuild } from './fetchCachedBuild.js';
import { getLocalBuildCacheBinaryPath } from './localBuildCache.js';

export async function getBinaryPath({
  artifactName,
  binaryPathFlag,
  localFlag,
  remoteCacheProvider,
}: {
  artifactName: string;
  binaryPathFlag?: string;
  localFlag?: boolean;
  remoteCacheProvider: null | (() => RemoteBuildCache) | undefined;
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
      const message = (error as RnefError).message;
      const cause = (error as RnefError).cause;
      logger.warn(
        `Failed to fetch cached build for ${artifactName}: \n${message}`,
        cause ? `\nCause: ${cause.toString()}` : ''
      );
      logger.debug('Remote cache failure error:', error);
      logger.info('Continuing with local build');
    }
  }

  return binaryPath;
}
