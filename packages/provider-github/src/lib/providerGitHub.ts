import type { RemoteArtifact, RemoteBuildCache } from '@rock-js/tools';
import {
  deleteGitHubArtifacts,
  fetchGitHubArtifactsByName,
} from './artifacts.js';
import {
  detectGitHubRepoDetails,
  getGitHubCLIToken,
  type GitHubRepoDetails,
} from './config.js';

export class GitHubBuildCache implements RemoteBuildCache {
  name = 'GitHub';
  repoDetails: GitHubRepoDetails | null = null;

  constructor(config?: { owner: string; repository: string; token: string }) {
    if (config) {
      const token = config.token || process.env['GITHUB_TOKEN'];
      if (token) {
        this.repoDetails = {
          owner: config.owner,
          repository: config.repository,
          token,
        };
      } else {
        // Defer token resolution to getRepoDetails() so we can await getGitHubCLIToken()
        this.repoDetails = null;
        this._pendingConfig = config;
      }
    }
  }

  private _pendingConfig?: { owner: string; repository: string; token: string };

  async getRepoDetails() {
    if (!this.repoDetails) {
      if (this._pendingConfig) {
        const cliToken = await getGitHubCLIToken();
        if (!cliToken) {
          throw new Error(
            'GitHub Personal Access Token is required to fetch remote cache. Configure `GITHUB_TOKEN` variable in .env file, pass it as a `token` argument, or authenticate with GitHub CLI (`gh auth login`).',
          );
        }
        this.repoDetails = {
          owner: this._pendingConfig.owner,
          repository: this._pendingConfig.repository,
          token: cliToken,
        };
        this._pendingConfig = undefined;
      } else {
        this.repoDetails = await detectGitHubRepoDetails();
      }
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
    const repoDetails = await this.getRepoDetails();
    const artifacts = await fetchGitHubArtifactsByName(
      artifactName,
      repoDetails,
      limit,
    );
    return artifacts.map((artifact) => ({
      name: artifact.name,
      url: artifact.downloadUrl,
      id: String(artifact.id),
    }));
  }

  async download({
    artifactName,
  }: {
    artifactName: string;
  }): Promise<Response> {
    const repoDetails = await this.getRepoDetails();
    const artifacts = await this.list({ artifactName });
    if (artifacts.length === 0) {
      throw new Error(`No artifact found with name "${artifactName}"`);
    }
    return fetch(artifacts[0].url, {
      headers: {
        Authorization: `token ${repoDetails.token}`,
        'Accept-Encoding': 'None',
      },
    });
  }

  async delete({
    artifactName,
    limit,
    skipLatest,
  }: {
    artifactName: string;
    limit?: number;
    skipLatest?: boolean;
  }): Promise<RemoteArtifact[]> {
    const repoDetails = await this.getRepoDetails();
    const artifacts = await fetchGitHubArtifactsByName(
      artifactName,
      repoDetails,
      limit,
    );
    if (artifacts.length === 0) {
      throw new Error(`No artifact found with name "${artifactName}"`);
    }
    const [, ...rest] = artifacts;
    return await deleteGitHubArtifacts(
      skipLatest ? rest : artifacts,
      repoDetails,
      artifactName,
    );
  }

  async upload(): Promise<
    RemoteArtifact & {
      getResponse: (
        buffer: Buffer | ((baseUrl: string) => Buffer),
        contentType?: string | undefined,
      ) => Response;
    }
  > {
    throw new Error(
      'Uploading artifacts to GitHub is not supported through GitHub API. See: https://docs.github.com/en/rest/actions/artifacts?apiVersion=2022-11-28',
    );
  }
}

export const providerGitHub =
  (options?: { owner: string; repository: string; token: string }) =>
  (): RemoteBuildCache =>
    new GitHubBuildCache(options);
