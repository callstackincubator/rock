import * as fs from 'node:fs';
import * as nodePath from 'node:path';
import { Octokit } from 'octokit';
import { detectGitHubRepoDetails } from './config.js';
// @ts-expect-error fix
import admzip from 'adm-zip';

const PAGE_SIZE = 100; // Maximum allowed by GitHub API
const GITHUB_TOKEN = process.env['GITHUB_TOKEN'];

export type GitHubArtifact = {
  id: number;
  name: string;
  expiresAt: string | null;
  sizeInBytes: number;
  downloadUrl: string;
};

export async function fetchGitHubArtifactsByName(
  name: string
): Promise<GitHubArtifact[]> {
  const octokit = new Octokit({
    auth: GITHUB_TOKEN,
  });

  const repoDetails = await detectGitHubRepoDetails();
  if (!repoDetails) {
    throw new Error('Unable to detect GitHub repository details');
  }

  const result: GitHubArtifact[] = [];
  let page = 1;

  while (true) {
    const response = await octokit.rest.actions.listArtifactsForRepo({
      owner: repoDetails.owner,
      repo: repoDetails.repository,
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

  result.sort((a, b) => {
    const expiresA = a.expiresAt ?? '0000-00-00';
    const expiresB = b.expiresAt ?? '0000-00-00';
    // Sort in descending order
    return expiresB.localeCompare(expiresA);
  });
  return result;
}

export async function downloadGitHubArtifact(
  artifact: GitHubArtifact,
  path: string
): Promise<string> {
  try {
    fs.mkdirSync(path, {
      recursive: true,
    });

    const response = await fetch(artifact.downloadUrl, {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download artifact: ${response.statusText}`);
    }

    const targetPath = nodePath.join(path, artifact.name);
    const zipPath = targetPath + '.zip';
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(zipPath, Buffer.from(buffer));

    try {
      // Unzip the file using adm-zip
      const zip = new admzip(zipPath);
      // @ts-expect-error fix
      zip.getEntries().forEach((entry) => {
        // there's only one entry in the zip file, so simplifying to this
        const entryPath = targetPath;
        if (entry.isDirectory) {
          fs.mkdirSync(entryPath, { recursive: true });
        } else {
          const directory = nodePath.dirname(entryPath);
          fs.mkdirSync(directory, { recursive: true });
          fs.writeFileSync(entryPath, entry.getData());
        }
      });
    } catch (error) {
      console.log(`Failed to unzip file: ${error}`);
    }

    try {
      // Remove the zip file after extraction
      fs.unlinkSync(zipPath);
    } catch (error) {
      console.log(`Failed to remove zip file: ${error}`);
    }
    return targetPath;
  } catch (error) {
    throw new Error(`Failed to download cached build ${error}`);
  }
}
