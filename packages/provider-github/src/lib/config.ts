import {
  cacheManager,
  colorLink,
  logger,
  promptPassword,
  RockError,
  spawn,
} from '@rock-js/tools';
import * as r from 'ts-regex-builder';
import { getGitRemote } from './getGitRemote.js';

const GITHUB_REPO_REGEX = r.buildRegExp([
  r.startOfString,
  r.choiceOf('git@', 'https://'),
  r.oneOrMore(/[^:/]/),
  r.anyOf(':/'),
  r.capture(r.oneOrMore(/[^/]/)), // organization
  '/',
  r.capture(r.oneOrMore(r.any, { greedy: false })), // repository
  r.optional('.git'),
  r.endOfString,
]);

export function getGitHubToken(): string | undefined {
  return cacheManager.get('githubToken');
}

export async function getGitHubCLIToken(): Promise<string | undefined> {
  try {
    const { output: token } = await spawn('gh', ['auth', 'token'], {
      stdio: 'pipe',
    });
    const trimmed = token.trim();
    if (trimmed) {
      logger.info('Using GitHub token from GitHub CLI (`gh auth token`).');
      return trimmed;
    }
  } catch {
    // gh CLI not installed or not authenticated — fall through
  }
  return undefined;
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

  if (!gitRemote) {
    throw new RockError(`No git remote found for GitHub repository.`);
  }

  try {
    const { output: url } = await spawn(
      'git',
      ['config', '--get', `remote.${gitRemote}.url`],
      { stdio: 'pipe' },
    );

    const match = url.match(GITHUB_REPO_REGEX);
    if (!match) {
      throw new RockError(
        `The remote URL "${url}" doesn't look like a GitHub repo.`,
      );
    }
    let token =
      getGitHubToken() ?? process.env['GITHUB_TOKEN'] ?? (await getGitHubCLIToken());
    if (!token) {
      logger.warn(
        `No GitHub Personal Access Token found necessary to download cached builds.
You can either:
  - Install GitHub CLI and authenticate with ${colorLink('gh auth login')}
  - Generate a token at: ${colorLink('https://github.com/settings/tokens')}
    Include "repo", "workflow", and "read:org" permissions.`,
      );
      token = await promptForGitHubToken();
    }

    return {
      owner: match[1],
      repository: match[2],
      token,
    };
  } catch (error) {
    throw new RockError('Unable to detect GitHub repository details.', {
      cause: error,
    });
  }
}
