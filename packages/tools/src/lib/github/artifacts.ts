import * as fs from 'node:fs';
import * as nodePath from 'node:path';
import { Octokit } from 'octokit';
import AdmZip from 'adm-zip';
import { detectGitHubRepoDetails } from './config.js';

const PAGE_SIZE = 100; // Maximum allowed by GitHub API
const GITHUB_TOKEN = process.env['GITHUB_TOKEN'];

type FormatArtifactNameParams = {
  platform: string;
  mode: string;
  hash: string;
};

/**
 * e.g. rnef-android-debug-1234567890
 */
export function formatArtifactName({
  platform,
  mode,
  hash,
}: FormatArtifactNameParams): string {
  return `rnef-${platform}-${mode}-${hash}`;
}

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
  targetPath: string
): Promise<void> {
  try {
    fs.mkdirSync(targetPath, {
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

    const zipPath = targetPath + '.zip';
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(zipPath, Buffer.from(buffer));

    unzipFile(zipPath, targetPath);
    fs.unlinkSync(zipPath);
  } catch (error) {
    console.log('Error: ', error);
    throw new Error(`Failed to download cached build ${error}`);
  }
}

function unzipFile(zipPath: string, targetPath: string): void {
  const zip = new AdmZip(zipPath);
  zip.extractAllTo(targetPath, true);
}
