import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import fs from 'node:fs';
import path from 'node:path';
import type { IOSDependencyConfig } from '@react-native-community/cli-types';
import { cacheManager, logger, RnefError, spinner } from '@rnef/tools';
import type { SubprocessError } from 'nano-spawn';
import spawn from 'nano-spawn';
import color from 'picocolors';
import type { ApplePlatform } from '../types/index.js';

export async function installPodsIfNeeded(
  projectRoot: string,
  platformName: ApplePlatform,
  sourceDir: string
) {
  const packageJson = loadPackageJSON(projectRoot);
  const podsPath = path.join(sourceDir, 'Pods');
  const podfilePath = path.join(sourceDir, 'Podfile');
  const podfileLockPath = podfilePath + '.lock';
  const manifestLockPath = path.join(podsPath, 'Manifest.lock');

  let podfile;
  try {
    podfile = readFileSync(podfilePath, 'utf-8');
  } catch {
    throw new RnefError(`No Podfile found at: ${podfilePath}`);
  }

  let podfileLock: string | undefined;
  try {
    podfileLock = readFileSync(podfileLockPath, 'utf-8');
  } catch {
    logger.debug('No Podfile.lock, continue');
  }

  // There's a possibility to define a custom dependencies in `react-native.config.js`, that contain native code for a platform and that should also trigger install CocoaPods
  const platformDependencies = await getPlatformDependencies(platformName);

  const calculateCurrentHash = () => {
    return generateDependenciesHash([
      generateMd5Hash(podfile),
      generateMd5Hash(podfileLock ?? ''),
      getLockfileChecksum(podfileLockPath),
      getLockfileChecksum(manifestLockPath),
      generateDependenciesHash(platformDependencies),
      generateDependenciesHash(Object.keys(packageJson.dependencies || {})),
    ]);
  };
  const cacheKey = `${packageJson['name']}-dependencies`;
  const cachedDependenciesHash = cacheManager.get(cacheKey);
  const podsDirExists = existsSync(podsPath);
  const hashChanged =
    cachedDependenciesHash &&
    !compareMd5Hashes(calculateCurrentHash(), cachedDependenciesHash);

  if (!podsDirExists || hashChanged) {
    try {
      await installPods({ projectRoot, sourceDir, podfilePath });
      cacheManager.set(cacheKey, calculateCurrentHash());
    } catch {
      const relativePath = path.relative(process.cwd(), sourceDir);
      const command = cachedDependenciesHash
        ? `cd ${relativePath} && bundle exec pod install`
        : `bundle install && cd ${relativePath} && bundle exec pod install`;

      throw new RnefError(
        `Something went wrong while installing CocoaPods. Please run: 
${color.bold(command)}`
      );
    }
  }
}

async function runPodInstall(options: {
  shouldHandleRepoUpdate?: boolean;
  sourceDir: string;
}) {
  await validatePodCommand(options.sourceDir);

  const shouldHandleRepoUpdate = options?.shouldHandleRepoUpdate || true;
  const loader = spinner({ indicator: 'timer' });
  try {
    loader.start('Installing CocoaPods dependencies');

    await spawn('bundle', ['exec', 'pod', 'install'], {
      env: {
        RCT_NEW_ARCH_ENABLED: process.env['RCT_NEW_ARCH_ENABLED'] ?? '1',
        RCT_IGNORE_PODS_DEPRECATION:
          process.env['RCT_IGNORE_PODS_DEPRECATION'] ?? '1',
      },
      cwd: options.sourceDir,
    });
  } catch (error) {
    const stderr = (error as SubprocessError).stderr;

    /**
     * If CocoaPods failed due to repo being out of date, it will
     * include the update command in the error message.
     *
     * `shouldHandleRepoUpdate` will be set to `false` to
     * prevent infinite loop (unlikely scenario)
     */
    if (stderr.includes('pod repo update') && shouldHandleRepoUpdate) {
      await runPodUpdate(options.sourceDir);
      await runPodInstall({
        shouldHandleRepoUpdate: false,
        sourceDir: options.sourceDir,
      });
    } else {
      loader.stop('CocoaPods installation failed.', 1);

      throw new RnefError(
        `Looks like your iOS environment is not properly set.`,
        { cause: stderr }
      );
    }
  }

  loader.stop('CocoaPods installed successfully.');
}

async function runPodUpdate(cwd: string) {
  const loader = spinner({ indicator: 'timer' });
  try {
    loader.start('Updating CocoaPods repositories');
    await spawn('pod', ['repo', 'update'], { cwd });
  } catch (error) {
    const stderr =
      (error as SubprocessError).stderr || (error as SubprocessError).stdout;
    loader.stop();

    throw new RnefError(
      `Failed to update CocoaPods repositories for iOS project.\nPlease try again manually: "pod repo update".\nCocoaPods documentation: ${color.dim(
        'https://cocoapods.org/'
      )}`,
      { cause: stderr }
    );
  }
}

async function installPods(options: {
  sourceDir: string;
  projectRoot: string;
  podfilePath: string;
}) {
  try {
    if (!existsSync(options.podfilePath)) {
      logger.debug(
        `No Podfile at ${options.podfilePath}. Skipping pod install.`
      );
      return;
    }
    await runBundleInstall(options.sourceDir, options.projectRoot);
    await runPodInstall({ sourceDir: options.sourceDir });
  } catch {
    throw new RnefError(
      `Something went wrong while installing CocoaPods. Please run ${color.bold(
        `bundle install && cd ${path.relative(
          process.cwd(),
          options.sourceDir
        )} && bundle exec pod install`
      )} manually`
    );
  }
}

/*
 * Check if "pod" is available and usable. It happens that there are
 * multiple versions of "pod" command and even though it's there, it exits
 * with a failure
 */
async function validatePodCommand(sourceDir: string) {
  try {
    await spawn('pod', ['--version'], { cwd: sourceDir });
  } catch (error) {
    const stderr =
      (error as SubprocessError).stderr || (error as SubprocessError).stdout;
    throw new RnefError(
      '"pod" command not found. Please make sure to install CocoaPods correctly',
      { cause: stderr }
    );
  }
}

async function runBundleInstall(sourceDir: string, projectRoot: string) {
  const gemfilePath = path.join(projectRoot, 'Gemfile');
  if (!fs.existsSync(gemfilePath)) {
    throw new RnefError(
      `Could not find the Gemfile at ${gemfilePath}. Currently the CLI requires to have this file in the root directory of the project to install CocoaPods. If your configuration is different, please install the CocoaPods manually.`
    );
  }

  const loader = spinner();
  try {
    loader.start('Installing Ruby Gems');
    await spawn('bundle', ['install'], { cwd: sourceDir });
  } catch (error) {
    const stderr =
      (error as SubprocessError).stderr || (error as SubprocessError).stdout;
    loader.stop('Ruby Gems installation failed.', 1);
    throw new RnefError(
      `Looks like your iOS environment is not properly set.`,
      { cause: stderr }
    );
  }

  loader.stop('Installed Ruby Gems.');
}

function loadPackageJSON(root: string) {
  const packageJSONPath = path.join(root, 'package.json');
  const packageJSONContent = readFileSync(packageJSONPath, 'utf-8');
  const packageJSON = JSON.parse(packageJSONContent);
  return packageJSON;
}

async function getPlatformDependencies(platformName: ApplePlatform) {
  const { loadConfigAsync } = await import(
    '@react-native-community/cli-config'
  );
  const config = await loadConfigAsync({ selectedPlatform: platformName });
  const dependencies = config.dependencies;
  return Object.keys(dependencies)
    .filter((dependency) => dependencies[dependency].platforms?.[platformName])
    .map(
      (dependency) =>
        `${dependency}@${
          (
            dependencies[dependency].platforms?.[
              platformName
            ] as IOSDependencyConfig
          ).version
        }`
    )
    .sort();
}

function generateMd5Hash(text: string) {
  return createHash('md5').update(text).digest('hex');
}

function compareMd5Hashes(hash1: string, hash2: string) {
  return hash1 === hash2;
}

function generateDependenciesHash(deps: string[]) {
  return generateMd5Hash(JSON.stringify(deps));
}

/**
 * Gets the checksum of Podfile.lock or Pods/Manifest.lock
 */
function getLockfileChecksum(lockfilePath: string) {
  try {
    const checksumLine = fs
      .readFileSync(lockfilePath, 'utf8')
      .split('\n')
      .find((line) => line.includes('PODFILE CHECKSUM'));

    if (checksumLine) {
      return checksumLine.split(': ')[1];
    }
  } catch (error) {
    logger.debug(`Failed to load the lockfile ${lockfilePath}`, error);
  }
  return '';
}
