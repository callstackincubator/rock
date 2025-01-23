import fs from 'node:fs';
import path from 'node:path';
import { spinner } from '@clack/prompts';
import {
  getRemoteBuildCache,
  findDirectoriesWithPattern,
  formatArtifactName,
  getProjectRoot,
  type LocalBuild,
  nativeFingerprint,
  queryLocalBuildCache,
  logger,
} from '@rnef/tools';
import color from 'picocolors';
import * as tar from 'tar';

export type FetchCachedBuildOptions = {
  mode: string;
};

export async function fetchCachedBuild({
  mode,
}: FetchCachedBuildOptions): Promise<LocalBuild | null> {
  const loader = spinner();
  loader.start('Looking for a local cached build');

  const root = getProjectRoot();
  const artifactName = await calculateArtifactName(mode);

  const localBuild = queryLocalBuildCache(artifactName, { findBinary });
  if (localBuild != null) {
    loader.stop(`Found local cached build: ${color.cyan(localBuild.name)}`);
    return localBuild;
  } else {
    loader.stop(`No local cached build found for ${color.cyan(artifactName)}.`);
  }

  const remoteBuildCache = getRemoteBuildCache();
  if (!remoteBuildCache) {
    logger.debug(`No CI provider detected, skipping remote build cache.`);
    return null;
  }

  const hasToken = await remoteBuildCache.promptCredentialsIfNeeded();
  if (!hasToken) {
    logger.log(`No token provided, skipping remote build cache.`);
    return null;
  }

  loader.start(`Looking for a cached build on ${remoteBuildCache.name}`);
  const remoteBuild = await remoteBuildCache.query(artifactName);
  if (!remoteBuild) {
    loader.stop(`No cached build found for "${artifactName}".`);
    return null;
  }

  loader.message(`Downloading cached build from ${remoteBuildCache.name}`);
  const fetchedBuild = await remoteBuildCache.download(remoteBuild);
  await extractArtifactTarball(fetchedBuild.path);
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

async function calculateArtifactName(mode: string) {
  const root = getProjectRoot();
  const fingerprint = await nativeFingerprint(root, { platform: 'ios' });
  return formatArtifactName({
    platform: 'ios',
    mode,
    hash: fingerprint.hash,
  });
}

function findBinary(path: string): string | null {
  const apps = findDirectoriesWithPattern(path, /\.app$/);
  if (apps.length > 0) {
    return apps[0];
  }

  return null;
}

// GitHub artifact for iOS is a tar.gz file (contained in the downloaded .zip file).
// The reason for this is that GitHub upload-artifact  drop execute file permission during packing to zip,
// so HelloWorld.app (and it's contents) is not executable.
// The recommended workaround is to pack to .tar.gz first.
// See: https://github.com/actions/upload-artifact?tab=readme-ov-file#permission-loss
async function extractArtifactTarball(artifactPath: string) {
  const tarPath = path.join(artifactPath, 'app.tar.gz');
  if (fs.existsSync(tarPath)) {
    await tar.extract({
      file: tarPath,
      cwd: artifactPath,
      gzip: true,
    });
    fs.unlinkSync(tarPath);
  }
}
