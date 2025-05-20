import { RnefError } from '../error.js';
import type { RemoteBuildCache } from './common.js';

export async function createRemoteBuildCache(
  remoteCacheProvider: 'github-actions' | null | (() => RemoteBuildCache)
): Promise<RemoteBuildCache | null> {
  if (remoteCacheProvider === 'github-actions') {
    try {
      // @ts-expect-error @rnef/provider-github may not be installed
      const { providerGitHub } = await import('@rnef/provider-github');
      const gitHubCacheProvider = providerGitHub();
      return gitHubCacheProvider();
    } catch (error) {
      throw new RnefError('Failed to create GitHub Actions cache provider', {
        cause: error,
      });
    }
  }

  if (remoteCacheProvider && typeof remoteCacheProvider !== 'string') {
    return remoteCacheProvider();
  }

  return null;
}
