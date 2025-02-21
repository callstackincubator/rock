import path from 'node:path';
import type { LocalBuild, SupportedRemoteCacheProviders } from '@rnef/tools';
import {
  color,
  createRemoteBuildCache,
  findFilesWithPattern,
  formatArtifactName,
  getProjectRoot,
  logger,
  nativeFingerprint,
  queryLocalBuildCache,
  spinner,
} from '@rnef/tools';

type FetchCachedBuildOptions = {
  variant: string;
  remoteCacheProvider: SupportedRemoteCacheProviders | undefined;
};

export async function fetchCachedBuild({
  variant,
  remoteCacheProvider,
}: FetchCachedBuildOptions): Promise<LocalBuild | null> {
  if (remoteCacheProvider === null) {
    return null;
  }
  if (remoteCacheProvider === undefined) {
    logger.warn(`No remote cache provider set. You won't be able to access reusable builds from e.g. GitHub Actions. 
To configure it, set the "remoteCacheProvider" key in ${color.cyan(
      'rnef.config.js'
    )} file:
{
  remoteCacheProvider: 'github-actions'
}
To disable this warning, set "remoteCacheProvider" to null.
Proceeding with local build.`);
    return null;
  }
  const loader = spinner();
  loader.start('Looking for a local cached build');

  const root = getProjectRoot();
  const artifactName = await calculateArtifactName(variant);

  const localBuild = queryLocalBuildCache(artifactName, { findBinary });
  if (localBuild != null) {
    loader.stop(`Found local cached build: ${color.cyan(localBuild.name)}`);
    return localBuild;
  }

  const remoteBuildCache = await createRemoteBuildCache(remoteCacheProvider);
  if (!remoteBuildCache) {
    loader.stop(`No supported remote provider set, skipping.`);
    return null;
  }

  loader.stop(`No local build cached. Checking ${remoteBuildCache.name}.`);
  const repoDetails = await remoteBuildCache.detectRepoDetails();
  if (!repoDetails) {
    return null;
  }

  loader.start(`Looking for a cached build on ${remoteBuildCache.name}`);
  const remoteBuild = await remoteBuildCache.query(artifactName);
  if (!remoteBuild) {
    loader.stop(`No cached build found for "${artifactName}".`);
    return null;
  }

  loader.message(`Downloading cached build from ${remoteBuildCache.name}`);
  const fetchedBuild = await remoteBuildCache.download(remoteBuild, loader);
  const binaryPath = findBinary(fetchedBuild.path);
  if (!binaryPath) {
    loader.stop(`No binary found in "${artifactName}".`);
    return null;
  }

  loader.stop(
    `Downloaded cached build: ${color.cyan(path.relative(root, binaryPath))}.`
  );

  return {
    name: fetchedBuild.name,
    artifactPath: fetchedBuild.path,
    binaryPath,
  };
}

async function calculateArtifactName(variant: string) {
  const root = getProjectRoot();
  const fingerprint = await nativeFingerprint(root, { platform: 'android' });
  return formatArtifactName({
    platform: 'android',
    build: variant,
    hash: fingerprint.hash,
  });
}

function findBinary(path: string): string | null {
  const apks = findFilesWithPattern(path, /\.apk$/);
  if (apks.length > 0) {
    return apks[0];
  }

  const aabs = findFilesWithPattern(path, /\.aab$/);
  if (aabs.length > 0) {
    return aabs[0];
  }

  return null;
}
