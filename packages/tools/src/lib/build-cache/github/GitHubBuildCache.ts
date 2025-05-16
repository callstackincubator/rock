import { color } from '../../color.js';
import { RnefError } from '../../error.js';
import { getGitRemote } from '../../git.js';
import logger from '../../logger.js';
import type { RemoteArtifact, RemoteBuildCache } from '../common.js';
import {
  deleteGitHubArtifacts,
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

  async detectRepoDetails() {
    const gitRemote = await getGitRemote();
    this.repoDetails = gitRemote
      ? await detectGitHubRepoDetails(gitRemote)
      : null;
    if (!this.repoDetails) {
      return null;
    }
    if (!getGitHubToken()) {
      logger.warn(
        `No GitHub Personal Access Token found necessary to download cached builds.
Please generate one at: ${color.cyan('https://github.com/settings/tokens')}
Include "repo", "workflow", and "read:org" permissions.`
      );
      await promptForGitHubToken();
    }
    return this.repoDetails;
  }

  async list({
    artifactName,
    limit,
  }: {
    artifactName?: string;
    limit?: number;
  }): Promise<RemoteArtifact[]> {
    const repoDetails = await this.detectRepoDetails();
    if (!getGitHubToken()) {
      throw new RnefError(`No GitHub Personal Access Token found.`);
    }
    if (!repoDetails) {
      return [];
    }
    const artifacts = await fetchGitHubArtifactsByName(
      artifactName,
      repoDetails,
      limit
    );
    return artifacts.map((artifact) => ({
      name: artifact.name,
      url: artifact.downloadUrl,
    }));
  }

  async download({
    artifactName,
  }: {
    artifactName: string;
  }): Promise<Response> {
    const artifacts = await this.list({ artifactName });
    if (artifacts.length === 0) {
      throw new RnefError(`No artifact found with name "${artifactName}"`);
    }
    return fetch(artifacts[0].url, {
      headers: {
        Authorization: `token ${getGitHubToken()}`,
        'Accept-Encoding': 'None',
      },
    });
  }

  async delete({
    artifactName,
  }: {
    artifactName: string;
  }): Promise<RemoteArtifact[]> {
    const repoDetails = await this.detectRepoDetails();
    if (!repoDetails) {
      return [];
    }
    const artifacts = await fetchGitHubArtifactsByName(
      artifactName,
      repoDetails,
      undefined
    );
    if (artifacts.length === 0) {
      throw new RnefError(`No artifact found with name "${artifactName}"`);
    }
    return await deleteGitHubArtifacts(artifacts, repoDetails, artifactName);
  }

  async upload(): Promise<RemoteArtifact> {
    throw new RnefError('Uploading artifacts to GitHub is not supported.');
  }
}
