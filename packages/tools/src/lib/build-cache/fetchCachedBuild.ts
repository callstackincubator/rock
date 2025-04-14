import fs from 'node:fs';
import path from 'node:path';
import * as tar from 'tar';
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

  loader.start(`Looking for a cached build on ${remoteBuildCache.name}`);
  const remoteBuild = await remoteBuildCache.query({ artifactName });
  if (!remoteBuild) {
    loader.stop(`No cached build found for "${artifactName}".`);
    return null;
  }

  loader.message(`Downloading cached build from ${remoteBuildCache.name}`);
  const fetchedBuild = await remoteBuildCache.download({
    artifact: remoteBuild,
    loader,
  });
  await extractArtifactTarballIfNeeded(fetchedBuild.path);
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

async function extractArtifactTarballIfNeeded(artifactPath: string) {
  const tarPath = path.join(artifactPath, 'app.tar.gz');

  // If the tarball is not found, it means the artifact is already unpacked.
  if (!fs.existsSync(tarPath)) {
    return;
  }

  // iOS simulator build artifact (*.app directory) is packed in .tar.gz file to
  // preserve execute file permission.
  // See: https://github.com/actions/upload-artifact?tab=readme-ov-file#permission-loss
  await tar.extract({
    file: tarPath,
    cwd: artifactPath,
    gzip: true,
  });
  fs.unlinkSync(tarPath);
}
