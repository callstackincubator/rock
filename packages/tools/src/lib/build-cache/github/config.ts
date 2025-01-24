import logger from '../../logger.js';
import { spawn } from '../../spawn.js';
import { GITHUB_REPO_REGEX } from './patterns.js';

export function hasGitHubToken(): boolean {
  return !!process.env['GITHUB_TOKEN'];
}

export type GitHubRepoDetails = {
  url: string;
  owner: string;
  repository: string;
};

export async function detectGitHubRepoDetails(
  gitRemote: string
): Promise<GitHubRepoDetails | null> {
  try {
    const { output: url } = await spawn('git', [
      'config',
      '--get',
      `remote.${gitRemote}.url`,
    ]);

    const match = url.match(GITHUB_REPO_REGEX);
    if (!match) {
      logger.warn(`The remote URL ${url} doesn't look like a GitHub repo.`);
      return null;
    }

    return {
      url,
      owner: match[1],
      repository: match[2],
    };
  } catch (error: unknown) {
    logger.warn('Unable to detect GitHub repository details.');
    logger.debug(error);
    return null;
  }
}
