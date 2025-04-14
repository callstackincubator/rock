import type { RemoteBuildCache } from './common.js';

export async function createRemoteBuildCache(
  remoteCacheProvider: 'github-actions' | null | { new (): RemoteBuildCache }
): Promise<RemoteBuildCache | null> {
  if (remoteCacheProvider === 'github-actions') {
    const { GitHubBuildCache } = await import('./github/GitHubBuildCache.js');
    return new GitHubBuildCache();
  }

  if (remoteCacheProvider && typeof remoteCacheProvider !== 'string') {
    return new remoteCacheProvider();
  }

  return null;
}
