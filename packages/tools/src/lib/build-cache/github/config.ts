import { select } from '@clack/prompts';
import spawn from 'nano-spawn';
import cacheManager from '../../cacheManager.js';
import logger from '../../logger.js';
import { checkCancelPrompt } from '../../prompts.js';
import { GITHUB_REPO_REGEX } from './patterns.js';

export function hasGitHubToken(): boolean {
  return !!process.env['GITHUB_TOKEN'];
}

export type GitHubRepoDetails = {
  url: string;
  owner: string;
  repository: string;
};

export async function detectGitHubRepoDetails(): Promise<GitHubRepoDetails | null> {
  try {
    let gitRemote = cacheManager.get('gitRemote');
    if (!gitRemote) {
      const { output: remoteOutput } = await spawn('git', ['remote']);
      const remotes = remoteOutput.split('\n').filter(Boolean);
      if (remotes.length > 1) {
        gitRemote = checkCancelPrompt<string>(
          await select({
            message: 'Select git remote of the upstream repository:',
            options: remotes.map((remote) => ({
              value: remote,
              label: remote,
            })),
          })
        );
        cacheManager.set('gitRemote', gitRemote);
      } else if (remotes.length === 1) {
        gitRemote = remotes[0];
      } else {
        logger.warn('No git remote found.');
        return null;
      }
    }
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
