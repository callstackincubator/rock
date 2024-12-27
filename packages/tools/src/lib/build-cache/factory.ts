import { detectContinuousIntegration } from '../ci.js';
import { BuildCacheConfig, RemoteBuildCache } from './common.js';
import { GitHubBuildCache } from './gitHubBuildCache.js';

export function createRemoteBuildCache(
  config: BuildCacheConfig
): RemoteBuildCache | null {
  const ci = detectContinuousIntegration();

  if (ci === 'github') {
    return new GitHubBuildCache(config);
  }

  return null;
}
