import color from 'picocolors';
import { getGitRemote } from '../../git.js';
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
import {
  detectGitHubRepoDetails,
  getGitHubToken,
  promptForGitHubToken,
} from './config.js';

export class GitHubBuildCache implements RemoteBuildCache {
  name = 'GitHub';
  repoDetails: GitHubRepoDetails | null = null;
  githubToken = getGitHubToken();

  async detectRepoDetails() {
    const gitRemote = await getGitRemote();
    this.repoDetails = gitRemote
      ? await detectGitHubRepoDetails(gitRemote)
      : null;
    if (!this.githubToken) {
      logger.warn(
        `No GitHub Personal Access Token found. You can generate one at: ${color.cyan(
          'https://github.com/settings/tokens'
        )}`
      );
      this.githubToken = await promptForGitHubToken();
    }
  }

  async query(artifactName: string): Promise<RemoteArtifact | null> {
    if (!getGitHubToken()) {
      logger.warn(`No GitHub Personal Access Token found.`);
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
