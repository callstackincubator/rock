import type { RemoteBuildCache } from './common.js';

export async function createRemoteBuildCache(
  remoteCacheProvider: 'github-actions' | null
): Promise<RemoteBuildCache | null> {
  if (remoteCacheProvider === 'github-actions') {
    const { GitHubBuildCache } = await import('./github/GitHubBuildCache.js');
    return new GitHubBuildCache();
  }

  return null;
}
