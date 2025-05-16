import cacheManager from '../../cacheManager.js';
import { color } from '../../color.js';
import { RnefError } from '../../error.js';
import { getGitRemote } from '../../git.js';
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
  return githubToken;
}

export type GitHubRepoDetails = {
  owner: string;
  repository: string;
  token: string;
};

export async function detectGitHubRepoDetails(): Promise<GitHubRepoDetails> {
  const gitRemote = await getGitRemote();
  try {
    const { output: url } = await spawn(
      'git',
      ['config', '--get', `remote.${gitRemote}.url`],
      { stdio: 'pipe' }
    );

    const match = url.match(GITHUB_REPO_REGEX);
    if (!match) {
      throw new RnefError(
        `The remote URL "${url}" doesn't look like a GitHub repo.`
      );
    }
    let token = getGitHubToken();
    if (!token) {
      logger.warn(
        `No GitHub Personal Access Token found necessary to download cached builds.
Please generate one at: ${color.cyan('https://github.com/settings/tokens')}
Include "repo", "workflow", and "read:org" permissions.`
      );
      token = await promptForGitHubToken();
    }

    return {
      owner: match[1],
      repository: match[2],
      token,
    };
  } catch (error) {
    throw new RnefError('Unable to detect GitHub repository details.', {
      cause: error,
    });
  }
}
