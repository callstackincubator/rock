import type {
  LocalArtifact,
  RemoteArtifact,
  RemoteBuildCache,
} from '../common.js';
import { getLocalArtifactPath } from '../common.js';
import {
  downloadGitHubArtifact,
  fetchGitHubArtifactsByName,
  promptGitHubTokenIfNeeded,
} from './artifacts.js';
import { hasGitHubToken } from './config.js';

export class GitHubBuildCache implements RemoteBuildCache {
  name = 'GitHub';

  async promptCredentialsIfNeeded(): Promise<boolean> {
    return await promptGitHubTokenIfNeeded();
  }

  async query(artifactName: string): Promise<RemoteArtifact | null> {
    if (!hasGitHubToken()) {
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

  async download(artifact: RemoteArtifact): Promise<LocalArtifact> {
    const artifactPath = getLocalArtifactPath(artifact.name);
    await downloadGitHubArtifact(artifact.downloadUrl, artifactPath);

    return {
      name: artifact.name,
      path: artifactPath,
    };
  }
}
