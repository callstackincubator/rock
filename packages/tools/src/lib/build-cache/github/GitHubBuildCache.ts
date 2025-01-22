import logger from '../../logger.js';
import type {
  LocalArtifact,
  RemoteArtifact,
  RemoteBuildCache,
} from '../common.js';
import { getLocalArtifactPath } from '../common.js';
import {
  downloadGitHubArtifact,
  fetchGitHubArtifactsByName,
} from './artifacts.js';
import type { GitHubRepoDetails } from './config.js';
import { detectGitHubRepoDetails, hasGitHubToken } from './config.js';

export class GitHubBuildCache implements RemoteBuildCache {
  name = 'GitHub';
  repoDetails: GitHubRepoDetails | null = null;

  async detectRepoDetails() {
    this.repoDetails = await detectGitHubRepoDetails();
  }

  async query(artifactName: string): Promise<RemoteArtifact | null> {
    if (!hasGitHubToken()) {
      logger.warn(
        `No GitHub token found, skipping cached build. Set GITHUB_TOKEN environment variable to use cached builds.`
      );
      return null;
    }

    const artifacts = await fetchGitHubArtifactsByName(
      artifactName,
      this.repoDetails
    );
    if (artifacts.length === 0) {
      return null;
    }

    return {
      name: artifacts[0].name,
      downloadUrl: artifacts[0].downloadUrl,
    };
  }

  async download(artifact: RemoteArtifact): Promise<LocalArtifact> {
    const artifactPath = getLocalArtifactPath(artifact.name);
    await downloadGitHubArtifact(artifact.downloadUrl, artifactPath);

    return {
      name: artifact.name,
      path: artifactPath,
    };
  }
}
