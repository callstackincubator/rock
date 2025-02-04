import cacheManager from '../../cacheManager.js';
import logger from '../../logger.js';
import { promptPassword } from '../../prompts.js';
import { spawn } from '../../spawn.js';
import { GITHUB_REPO_REGEX } from './patterns.js';

export function getGitHubToken(): string | undefined {
  return cacheManager.get('githubToken');
}

export async function promptForGitHubToken() {
  const githubToken = (await promptPassword({
    message: 'Paste your GitHub Personal Access Token',
    validate: (value) =>
      value.length === 0 ? 'Value is required.' : undefined,
  })) as string;
  cacheManager.set('githubToken', githubToken);
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
