import fs from 'node:fs';
import path from 'node:path';
import * as tar from 'tar';
import { color } from '../../color.js';
import { getGitRemote } from '../../git.js';
import logger from '../../logger.js';
import type { spinner } from '../../prompts.js';
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

  async query({
    artifactName,
  }: {
    artifactName: string;
  }): Promise<RemoteArtifact | null> {
    const repoDetails = await this.detectRepoDetails();
    if (!getGitHubToken()) {
      logger.warn(`No GitHub Personal Access Token found.`);
      return null;
    }

    if (!repoDetails) {
      return null;
    }

    const artifacts = await fetchGitHubArtifactsByName(
      artifactName,
      repoDetails
    );
    if (artifacts.length === 0) {
      return null;
    }

    return {
      name: artifacts[0].name,
      downloadUrl: artifacts[0].downloadUrl,
    };
  }

  async download({
    artifact,
    loader,
  }: {
    artifact: RemoteArtifact;
    loader: ReturnType<typeof spinner>;
  }): Promise<LocalArtifact> {
    const artifactPath = getLocalArtifactPath(artifact.name);
    await downloadGitHubArtifact(
      artifact.downloadUrl,
      artifactPath,
      this.name,
      loader
    );
    await extractArtifactTarballIfNeeded(artifactPath);
    return {
      name: artifact.name,
      path: artifactPath,
    };
  }
}

async function extractArtifactTarballIfNeeded(artifactPath: string) {
  const tarPath = path.join(artifactPath, 'app.tar.gz');

  // If the tarball is not found, it means the artifact is already unpacked.
  if (!fs.existsSync(tarPath)) {
    return;
  }

  // iOS simulator build artifact (*.app directory) is packed in .tar.gz file to
  // preserve execute file permission.
  // See: https://github.com/actions/upload-artifact?tab=readme-ov-file#permission-loss
  await tar.extract({
    file: tarPath,
    cwd: artifactPath,
    gzip: true,
  });
  fs.unlinkSync(tarPath);
}
