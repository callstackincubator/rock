import { Octokit } from 'octokit';

const PAGE_SIZE = 100; // Maximum allowed by GitHub API

export type GitHubArtifact = {
  id: number;
  name: string;
  expiresAt: string | null;
  sizeInBytes: number;
  downloadUrl: string;
};

async function fetchGitHubArtifactsByName(
  octokit: Octokit,
  repository: string,
  name: string
): Promise<GitHubArtifact[]> {
  const result: GitHubArtifact[] = [];
  let page = 1;

  while (true) {
    const response = await octokit.rest.actions.listArtifactsForRepo({
      owner: repository.split('/')[0],
      repo: repository.split('/')[1],
      name,
      per_page: PAGE_SIZE,
      page,
    });

    const artifacts = response.data.artifacts
      .filter((artifact) => !artifact.expired && artifact.workflow_run?.id)
      .map((artifact) => ({
        id: artifact.id,
        name: artifact.name,
        sizeInBytes: artifact.size_in_bytes,
        expiresAt: artifact.expires_at,
        downloadUrl: artifact.archive_download_url,
      }));

    result.push(...artifacts);

    if (artifacts.length < PAGE_SIZE) {
      break;
    }

    page += 1;
  }

  result.sort();
  return result;
}
