import { spinner } from '@clack/prompts';
import { logger, RnefError } from '@rnef/tools';
import type { SubprocessError } from 'nano-spawn';
import spawn from 'nano-spawn';

async function runBundleInstall(cwd: string) {
  const loader = spinner();
  try {
    loader.start('Installing Ruby Gems');
    await spawn('bundle', ['install'], {
      stdio: logger.isVerbose() ? 'inherit' : ['ignore', 'pipe', 'pipe'],
      cwd,
    });
  } catch (error) {
    loader.stop('Ruby Gems installation failed.', 1);
    throw new RnefError(
      `Looks like your iOS environment is not properly set.`,
      { cause: (error as SubprocessError).stdout }
    );
  }

  loader.stop('Installed Ruby Gems.');
}

export default runBundleInstall;
