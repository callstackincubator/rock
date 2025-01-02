import spawn from 'nano-spawn';
import logger from '../../logger.js';
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
    const { output: url } = await spawn('git', [
      'config',
      '--get',
      'remote.origin.url',
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
