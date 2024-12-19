import { execSync } from 'child_process';
import logger from '../logger.js';
import { GITHUB_REPO_REGEX } from './patterns.js';

export function hasGitHubToken(): boolean {
  return !!process.env['GITHUB_TOKEN'];
}

export type GitHubRepoDetails = {
  url: string;
  owner: string;
  repository: string;
};

export function detectGitHubRepoDetails(): GitHubRepoDetails | null {
  try {
    const url = execSync('git config --get remote.origin.url', {
      encoding: 'utf-8',
    }).trim();

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
    logger.error('Unable to detect GitHub repository details:', error);
    return null;
  }
}
