import fs from 'node:fs';
import path from 'node:path';
import { spinner } from '@clack/prompts';
import { logger, RnefError } from '@rnef/tools';
import spawn from 'nano-spawn';
import color from 'picocolors';
import runBundleInstall from './runBundleInstall.js';

interface PodInstallOptions {
  skipBundleInstall?: boolean;
  newArchEnabled?: boolean;
  platformProjectPath: string;
}

interface RunPodInstallOptions {
  shouldHandleRepoUpdate?: boolean;
  newArchEnabled?: boolean;
  platformProjectPath: string;
}

interface SpawnError extends Error {
  stderr: string;
  stdout: string;
}

async function runPodInstall(options: RunPodInstallOptions) {
  const shouldHandleRepoUpdate = options?.shouldHandleRepoUpdate || true;
  const loader = spinner();
  try {
    loader.start(
      `Installing CocoaPods dependencies ${color.bold(
        options.newArchEnabled ? 'with New Architecture' : ''
      )} ${color.dim('(this may take a few minutes)')}`
    );

    await spawn('bundle', ['exec', 'pod', 'install'], {
      env: {
        RCT_NEW_ARCH_ENABLED: options.newArchEnabled ? '1' : '0',
      },
      stdio: logger.isVerbose() ? 'inherit' : ['ignore', 'pipe', 'pipe'],
      cwd: options.platformProjectPath,
    });
  } catch (error) {
    logger.debug(error as string);
    const stderr = (error as SpawnError).stderr || (error as SpawnError).stdout;

    /**
     * If CocoaPods failed due to repo being out of date, it will
     * include the update command in the error message.
     *
     * `shouldHandleRepoUpdate` will be set to `false` to
     * prevent infinite loop (unlikely scenario)
     */
    if (stderr.includes('pod repo update') && shouldHandleRepoUpdate) {
      await runPodUpdate();
      await runPodInstall({
        shouldHandleRepoUpdate: false,
        newArchEnabled: options.newArchEnabled,
        platformProjectPath: options.platformProjectPath,
      });
    } else {
      loader.stop('CocoaPods installation failed.');
      logger.error(stderr);

      throw new RnefError(
        `Looks like your iOS environment is not properly set.`
      );
    }
  }

  loader.stop('CocoaPods installed successfully.');
}

async function runPodUpdate() {
  const loader = spinner();
  try {
    loader.start(
      `Updating CocoaPods repositories ${color.dim(
        '(this may take a few minutes)'
      )}`
    );
    spawn('pod', ['repo', 'update'], {
      stdio: logger.isVerbose() ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    logger.log((error as SpawnError).stderr || (error as SpawnError).stdout);
    loader.stop();

    throw new RnefError(
      `Failed to update CocoaPods repositories for iOS project.\nPlease try again manually: "pod repo update".\nCocoaPods documentation: ${color.dim(
        'https://cocoapods.org/'
      )}`
    );
  }
}

async function installCocoaPodsWithGem() {
  const options = ['install', 'cocoapods', '--no-document'];

  try {
    // First attempt to install `cocoapods`
    await spawn('gem', options, {
      stdio: logger.isVerbose() ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    });
  } catch {
    // If that doesn't work then try with sudo
    // await runSudo(`gem ${options.join(' ')}`);
  }
}

async function installCocoaPods() {
  const loader = spinner();

  loader.start('Installing CocoaPods');

  try {
    await installCocoaPodsWithGem();

    loader.stop();
  } catch (error) {
    loader.stop();
    logger.error((error as SpawnError).stderr);

    throw new RnefError(
      `An error occurred while trying to install CocoaPods, which is required by this template.\nPlease try again manually: sudo gem install cocoapods.\nCocoaPods documentation: ${color.dim(
        'https://cocoapods.org/'
      )}`
    );
  }
}

export default async function installPods(options: PodInstallOptions) {
  const loader = spinner();

  try {
    const hasPodfile = fs.existsSync(
      path.join(options.platformProjectPath, 'Podfile')
    );

    if (!hasPodfile) {
      return;
    }

    const gemfilePath = path.join(options.platformProjectPath, '../Gemfile');
    if (fs.existsSync(gemfilePath) && !options?.skipBundleInstall) {
      await runBundleInstall(options.platformProjectPath);
    } else if (!fs.existsSync(gemfilePath)) {
      throw new RnefError(
        'Could not find the Gemfile. Currently the CLI requires to have this file in the root directory of the project to install CocoaPods. If your configuration is different, please install the CocoaPods manually.'
      );
    }

    try {
      // Check if "pod" is available and usable. It happens that there are
      // multiple versions of "pod" command and even though it's there, it exits
      // with a failure
      await spawn('pod', ['--version'], {
        stdio: logger.isVerbose() ? 'inherit' : ['ignore', 'pipe', 'pipe'],
        cwd: options.platformProjectPath,
      });
    } catch {
      loader.start('Installing CocoaPods');
      await installCocoaPods();
    }

    await runPodInstall({
      newArchEnabled: options.newArchEnabled,
      platformProjectPath: options.platformProjectPath,
    });
  } catch {
    throw new RnefError(
      `Something went wrong while installing CocoaPods. Please run ${color.bold(
        `bundle install && cd ${path.relative(
          process.cwd(),
          options?.platformProjectPath ?? 'ios'
        )} && bundle exec pod install`
      )} manually`
    );
  }
}
