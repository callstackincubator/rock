import path from 'node:path';
import { color, colorLink } from '../color.js';
import type { RockError } from '../error.js';
import { getAllIgnorePaths } from '../fingerprint/ignorePaths.js';
import { type FingerprintSources } from '../fingerprint/index.js';
import { isInteractive } from '../isInteractive.js';
import logger from '../logger.js';
import { getProjectRoot } from '../project.js';
import { promptConfirm } from '../prompts.js';
import { spawn } from '../spawn.js';
import { formatArtifactName, type RemoteBuildCache } from './common.js';
import { fetchCachedBuild } from './fetchCachedBuild.js';
import { getLocalBuildCacheBinaryPath, hasUsedRemoteCacheBefore } from './localBuildCache.js';

export async function getBinaryPath({
  artifactName,
  binaryPathFlag,
  localFlag,
  remoteCacheProvider,
  fingerprintOptions,
  sourceDir,
  platformName,
}: {
  artifactName: string;
  binaryPathFlag?: string;
  localFlag?: boolean;
  remoteCacheProvider: null | (() => RemoteBuildCache) | undefined;
  fingerprintOptions: FingerprintSources;
  sourceDir: string;
  platformName: string;
}) {
  // 1. First check if the binary path is provided
  let binaryPath = binaryPathFlag;

  // 2. If not, check if the local build is requested
  if (!binaryPath && !localFlag) {
    binaryPath = getLocalBuildCacheBinaryPath(artifactName);
  }

  // 3. If not, check if the remote cache is requested
  if (!binaryPath && !localFlag) {
    binaryPath = await tryFetchCachedBuild({
      artifactName,
      remoteCacheProvider,
      fingerprintOptions,
      platformName,
      sourceDir,
    });
  }

  return binaryPath;
}

/**
 * Checks if the current directory is a git repository
 */
async function isGitRepository(sourceDir: string): Promise<boolean> {
  try {
    await spawn('git', ['rev-parse', '--is-inside-work-tree'], {
      stdio: 'ignore',
      cwd: sourceDir,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets the list of files that would be removed by git clean
 */
async function getFilesToClean(
  fingerprintOptions: FingerprintSources,
  platformName: string,
  sourceDir: string,
): Promise<string[]> {
  if (!(await isGitRepository(sourceDir))) {
    return [];
  }

  const projectRoot = getProjectRoot();
  const ignorePaths = [
    ...(fingerprintOptions?.ignorePaths ?? []),
    ...getAllIgnorePaths(
      platformName,
      path.relative(projectRoot, sourceDir), // git expects relative paths
      projectRoot,
    ),
  ];

  const { output } = await spawn('git', [
    'clean',
    '-fdx',
    '--dry-run',
    sourceDir,
    ...ignorePaths.flatMap((path) => ['-e', `${path}`]),
  ]);

  return output
    .split('\n')
    .map((line) => line.replace('Would remove ', ''))
    .filter((line) => line !== '');
}

/**
 * Executes git clean to remove files
 */
async function executeGitClean(
  fingerprintOptions: FingerprintSources,
  platformName: string,
  sourceDir: string,
): Promise<void> {
  if (!(await isGitRepository(sourceDir))) {
    throw new Error('Not a git repository');
  }

  const projectRoot = getProjectRoot();
  const ignorePaths = [
    ...(fingerprintOptions?.ignorePaths ?? []),
    ...getAllIgnorePaths(
      platformName,
      path.relative(projectRoot, sourceDir), // git expects relative paths
      projectRoot,
    ),
  ];

  await spawn('git', [
    'clean',
    '-fdx',
    sourceDir,
    ...ignorePaths.flatMap((path) => ['-e', `${path}`]),
  ]);
}

async function warnIgnoredFiles(
  fingerprintOptions: FingerprintSources,
  platformName: string,
  sourceDir: string,
) {
  const filesToClean = await getFilesToClean(fingerprintOptions, platformName, sourceDir);

  if (filesToClean.length > 0) {
    logger.warn(`There are files that likely affect fingerprint:
${filesToClean.map((file) => `- ${color.bold(file)}`).join('\n')}
Consider removing them or update ${color.bold(
      'fingerprint.ignorePaths',
    )} in ${colorLink('rock.config.mjs')}:
Read more: ${colorLink(
      'https://www.rockjs.dev/docs/configuration#fingerprint-configuration',
    )}`);
  }
}

/**
 * Tries to fetch cached build with optional debugging workflow
 */
async function tryFetchCachedBuild({
  artifactName,
  remoteCacheProvider,
  fingerprintOptions,
  platformName,
  sourceDir,
}: {
  artifactName: string;
  remoteCacheProvider: null | (() => RemoteBuildCache) | undefined;
  fingerprintOptions: FingerprintSources;
  platformName: string;
  sourceDir: string;
}): Promise<string | undefined> {
  try {
    const cachedBuild = await fetchCachedBuild({
      artifactName,
      remoteCacheProvider,
    });
    if (cachedBuild) {
      return cachedBuild.binaryPath;
    }
  } catch (error) {
    const message = (error as RockError).message;
    const cause = (error as RockError).cause;
    logger.warn(
      `Remote Cache: Failed to fetch cached build for ${color.bold(
        artifactName,
      )}.
Cause: ${message}${cause ? `\n${cause.toString()}` : ''}
Read more: ${colorLink(
        'https://rockjs.dev/docs/configuration#remote-cache-configuration',
      )}`,
    );

    // Check if user has used remote cache before and offer debugging
    if (isInteractive() && hasUsedRemoteCacheBefore()) {
      const cleanedAndRetried = await runCacheMissDebugging({
        fingerprintOptions,
        platformName,
        sourceDir,
        artifactName,
        remoteCacheProvider,
      });

      if (cleanedAndRetried) {
        return cleanedAndRetried;
      }
    }

    await warnIgnoredFiles(fingerprintOptions, platformName, sourceDir);
    logger.debug('Remote cache failure error:', error);
    logger.info('Continuing with local build');
  }

  return undefined;
}

/**
 * Runs the cache miss debugging workflow and returns binary path if successful
 */
async function runCacheMissDebugging({
  fingerprintOptions,
  platformName,
  sourceDir,
  artifactName,
  remoteCacheProvider,
}: {
  fingerprintOptions: FingerprintSources;
  platformName: string;
  sourceDir: string;
  artifactName: string;
  remoteCacheProvider: null | (() => RemoteBuildCache) | undefined;
}): Promise<string | undefined> {
  logger.info(''); // Add spacing
  const shouldDebug = await promptConfirm({
    message: `Would you like to debug this remote cache miss?`,
    confirmLabel: 'Yes, help me debug this',
    cancelLabel: 'No, continue with local build',
  });

  if (!shouldDebug) {
    return undefined;
  }

  // Step 1: Check what files would be cleaned
  const filesToClean = await getFilesToClean(fingerprintOptions, platformName, sourceDir);

  if (filesToClean.length === 0) {
    logger.info('✅ No files found that would affect fingerprinting.');
    // TODO: backlink to the docs here instead of a 404
    logger.info('   The cache miss might be due to other factors (CI environment, etc.)');
    return undefined;
  }

  // Step 2: Show user what would be cleaned and offer to clean
  logger.info(`📋 Found ${color.bold(filesToClean.length.toString())} files that affect cache fingerprint:`);
  filesToClean.slice(0, 10).forEach(file => {
    logger.info(`   - ${color.bold(file)}`);
  });

  if (filesToClean.length > 10) {
    logger.info(`   ... and ${filesToClean.length - 10} more files`);
  }
  logger.info(''); // Add spacing

  const shouldClean = await promptConfirm({
    message: `Clean these files and retry fetching?`,
    confirmLabel: 'Yes, clean files and retry',
    cancelLabel: 'No, continue with local build',
  });

  if (!shouldClean) {
    return undefined;
  }

  // Step 3: Clean files first
  logger.info('🧹 Cleaning files...');
  try {
    await executeGitClean(fingerprintOptions, platformName, sourceDir);
    logger.info('✅ Files cleaned successfully');
    logger.info(''); // Add spacing
  } catch (error) {
    logger.error(`❌ Failed to clean files: ${error}`);
    logger.info('   Continuing with local build...');
    return undefined;
  }

  // Extract platform and traits from the original artifact name to recalculate
  const projectRoot = getProjectRoot();
  const nameParts = artifactName.split('-');
  const platform = nameParts[1] as 'ios' | 'android' | 'harmony';
  const traits = nameParts.slice(2, -1); // Everything except 'rock', platform, and hash

  const cleanArtifactName = await formatArtifactName({
    platform,
    traits,
    root: projectRoot,
    fingerprintOptions,
  });

  // Step 5: Retry the fetch with the correct artifact name
  logger.info('🔄 Retrying remote cache with clean fingerprint...');

  const cachedBuild = await fetchCachedBuild({
    artifactName: cleanArtifactName,
    remoteCacheProvider,
  });

  if (cachedBuild) {
    logger.info('✅ Successfully fetched from remote cache after cleaning!');
    return cachedBuild.binaryPath;
  } else {
    logger.info('❌ Remote cache still missed after cleaning. Continuing with local build...');
    return undefined;
  }
}
