import * as fs from 'node:fs';
import AdmZip from 'adm-zip';
import { Octokit } from 'octokit';
import logger from '../../logger.js';
import { detectGitHubRepoDetails } from './config.js';

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
): Promise<GitHubArtifact[] | []> {
  const octokit = new Octokit({
    auth: GITHUB_TOKEN,
  });

  const repoDetails = await detectGitHubRepoDetails();
  if (!repoDetails) {
    // add visual space becuase this block is run within spinner.
    // @todo remove when @clack/prompts fixes it
    logger.log('');
    logger.warn(
      'Unable to detect GitHub repository details. Proceeding with building locally using Gradle.'
    );
    logger.log('');
    return [];
  }

  const result: GitHubArtifact[] = [];
  let page = 1;

  try {
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
  } catch (error) {
    if ((error as { message: string }).message.includes('Bad credentials')) {
      logger.warn(
        `Failed to fetch GitHub artifacts due to invalid GITHUB_TOKEN provided. 
You may be using GITHUB_TOKEN configured in your shell config file, such as ~/.zshrc.
Run "echo $GITHUB_TOKEN" to see the value.
Please generate a new token with access to this project and try again.`
      );
    } else {
      logger.warn(
        'Failed to fetch GitHub artifacts: ',
        (error as { message: string }).message
      );
    }
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
  downloadUrl: string,
  targetPath: string
): Promise<void> {
  try {
    fs.mkdirSync(targetPath, {
      recursive: true,
    });

    const response = await fetch(downloadUrl, {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download artifact: ${response.statusText}`);
    }

    const zipPath = targetPath + '.zip';
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(zipPath, new Uint8Array(buffer));

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
