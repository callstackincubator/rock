import {
  getLocalArtifactPath,
  RemoteBuildCache,
  RemoteArtifact,
  LocalArtifact,
} from './common.js';
import {
  downloadGitHubArtifact,
  fetchGitHubArtifactsByName,
} from '../github/artifacts.js';
import { hasGitHubToken } from '../github/config.js';
import { log } from '@clack/prompts';

export class GitHubBuildCache implements RemoteBuildCache {
  name = 'GitHub';

  async query(artifactName: string): Promise<RemoteArtifact | null> {
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

  async fetch(artifact: RemoteArtifact): Promise<LocalArtifact> {
    const artifactPath = getLocalArtifactPath(artifact.name);
    await downloadGitHubArtifact(artifact.downloadUrl, artifactPath);

    return {
      name: artifact.name,
      artifactPath: artifactPath,
    };
  }
}
