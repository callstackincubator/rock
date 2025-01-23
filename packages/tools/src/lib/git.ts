import { select } from '@clack/prompts';
import spawn from 'nano-spawn';
import cacheManager from './cacheManager.js';
import logger from './logger.js';
import { checkCancelPrompt } from './prompts.js';

export async function getGitRemote() {
  let gitRemote = cacheManager.get('gitRemote');
  if (gitRemote) {
    return gitRemote;
  }

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

  return gitRemote;
}
