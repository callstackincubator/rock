import { detectContinuousIntegration } from '../ci.js';
import { RemoteBuildCache } from './common.js';
import { GitHubBuildCache } from './gitHubBuildCache.js';

export function createRemoteBuildCache(): RemoteBuildCache | null {
  const ci = detectContinuousIntegration();

  if (ci === 'github') {
    return new GitHubBuildCache();
  }

  return null;
}
