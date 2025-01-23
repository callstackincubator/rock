import { detectContinuousIntegration } from '../ci.js';
import type { RemoteBuildCache } from './common.js';
import { GitHubBuildCache } from './github/GitHubBuildCache.js';

export function getRemoteBuildCache(): RemoteBuildCache | null {
  const ci = detectContinuousIntegration();

  if (ci === 'github') {
    // @todo change to dynamic import when extracting all github logic to a plugin
    return new GitHubBuildCache();
  }

  return null;
}
