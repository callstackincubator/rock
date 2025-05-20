import type { RemoteBuildCache } from './common.js';

export async function createRemoteBuildCache(
  remoteCacheProvider: null | (() => RemoteBuildCache)
): Promise<RemoteBuildCache | null> {
  if (remoteCacheProvider) {
    return remoteCacheProvider();
  }
  return null;
}
