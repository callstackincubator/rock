import path from 'node:path';
import logger from '../logger.js';
import { LocalBuild, queryLocalBuildCache } from './localBuildCache.js';
import { color } from '../color.js';
import { spinner } from '../prompts.js';
import { getProjectRoot } from '../project.js';
import { createRemoteBuildCache } from './remoteBuildCache.js';
import { SupportedRemoteCacheProviders } from './common.js';

export type Distribution = 'simulator' | 'device';

type FetchCachedBuildOptions = {
  artifactName: string;
  remoteCacheProvider: SupportedRemoteCacheProviders | undefined | null;
  findBinary: (path: string) => string | null;
};

export async function fetchCachedBuild({
  artifactName,
  remoteCacheProvider,
  findBinary,
}: FetchCachedBuildOptions): Promise<LocalBuild | null> {
  if (remoteCacheProvider === null) {
    return null;
  }
  if (remoteCacheProvider === undefined) {
    logger.warn(`No remote cache provider set. You won't be able to access reusable builds from e.g. GitHub Actions. 
To configure it, set the "remoteCacheProvider" key in ${color.cyan(
      'rnef.config.mjs'
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

  const localBuild = queryLocalBuildCache(artifactName, { findBinary });
  if (localBuild != null) {
    loader.stop(`Found local cached build: ${color.cyan(localBuild.name)}`);
    return localBuild;
  }

  const remoteBuildCache = await createRemoteBuildCache(remoteCacheProvider);
  if (!remoteBuildCache) {
    loader.stop(`No remote cache provider found, skipping.`);
    return null;
  }

  loader.stop(`No local build cached. Checking ${remoteBuildCache.name}.`);

  const remoteBuild = await remoteBuildCache.query({ artifactName });
  if (!remoteBuild) {
    loader.start('');
    loader.stop(`No cached build found for "${artifactName}".`);
    return null;
  }

  loader.message(`Downloading cached build from ${remoteBuildCache.name}`);
  const fetchedBuild = await remoteBuildCache.download({
    artifact: remoteBuild,
    loader,
  });

  const binaryPath = findBinary(fetchedBuild.path);
  if (!binaryPath) {
    loader.stop(`No binary found for "${artifactName}".`);
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
