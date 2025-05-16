import type { RemoteBuildCache } from './common.js';

export async function createRemoteBuildCache(
  remoteCacheProvider: 'github-actions' | null | (() => RemoteBuildCache)
): Promise<RemoteBuildCache | null> {
  if (remoteCacheProvider === 'github-actions') {
    const { pluginGitHubBuildCache } = await import(
      './github/GitHubBuildCache.js'
    );
    const gitHubCacheProvider = pluginGitHubBuildCache();
    return gitHubCacheProvider();
  }

  if (remoteCacheProvider && typeof remoteCacheProvider !== 'string') {
    return remoteCacheProvider();
  }

  return null;
}
