import { detectContinuousIntegration } from '../ci.js';
import { RemoteBuildCache } from './common.js';
import { GitHubBuildCache } from './github/GitHubBuildCache.js';

export function createRemoteBuildCache(): RemoteBuildCache | null {
  const ci = detectContinuousIntegration();

  if (ci === 'github') {
    return new GitHubBuildCache();
  }

  return null;
}
