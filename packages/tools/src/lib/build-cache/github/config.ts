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
        logger.log(); // create visual space
        gitRemote = checkCancelPrompt<string>(
          await select({
            message: 'Select git remote of your original project:',
            options: remotes.map((remote) => ({
              value: remote,
              label: remote,
            })),
          })
        );
        cacheManager.set('gitRemote', gitRemote);
      } else {
        gitRemote = remotes[0];
      }
    }
    const { output: url } = await spawn('git', [
      'config',
      '--get',
      `remote.${gitRemote}.url`,
    ]);

    const match = url.match(GITHUB_REPO_REGEX);
    if (!match) {
      return null;
    }

    return {
      url,
      owner: match[1],
      repository: match[2],
    };
  } catch (error: unknown) {
    logger.debug('Unable to detect GitHub repository details:', error);
    return null;
  }
}
