import {
  BuildCacheConfig,
  getLocalArtifactPath,
  LocalBuild,
  RemoteBuildCache,
  RemoteBuild,
} from './common.js';
import {
  downloadGitHubArtifact,
  fetchGitHubArtifactsByName,
} from '../github/artifacts.js';
import { hasGitHubToken } from '../github/config.js';
import { log } from '@clack/prompts';

export class GitHubBuildCache implements RemoteBuildCache {
  name = 'GitHub';
  config: BuildCacheConfig;

  constructor(config: BuildCacheConfig) {
    this.config = config;
  }

  async query(artifactName: string): Promise<RemoteBuild | null> {
    if (!hasGitHubToken()) {
      log.warn(
        `No GitHub token found, skipping cached build. Set GITHUB_TOKEN environment variable to use cached builds.`
      );
      return null;
    }

    const artifacts = await fetchGitHubArtifactsByName(artifactName);
    if (artifacts.length === 0) {
      return null;
    }

    return {
      name: artifacts[0].name,
      downloadUrl: artifacts[0].downloadUrl,
    };
  }

  async fetch(artifact: RemoteBuild): Promise<LocalBuild | null> {
    const { sourceDir, findBinary } = this.config;

    const artifactPath = getLocalArtifactPath(sourceDir, artifact.name);
    await downloadGitHubArtifact(artifact.downloadUrl, artifactPath);
    const binaryPath = findBinary(artifactPath);
    if (!binaryPath) {
      return null;
    }

    return {
      name: artifact.name,
      artifactPath: artifactPath,
      binaryPath,
    };
  }
}
