import { spinner } from '@clack/prompts';
import { logger, RnefError } from '@rnef/tools';
import type { SubprocessError } from 'nano-spawn';
import spawn from 'nano-spawn';

async function runBundleInstall() {
  const loader = spinner();
  try {
    loader.start('Installing Ruby Gems');

    await spawn('bundle', ['install'], {
      stdio: logger.isVerbose() ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    loader.stop('Ruby Gems installation failed.');
    logger.error(
      (error as SubprocessError).stderr || (error as SubprocessError).stdout
    );
    throw new RnefError(`Looks like your iOS environment is not properly set.`);
  }

  loader.stop('Ruby Gems installed successfully.');
}

export default runBundleInstall;
