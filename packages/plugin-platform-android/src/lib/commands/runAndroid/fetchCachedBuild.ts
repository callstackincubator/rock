import path from 'node:path';
import type { LocalBuild } from '@rnef/tools';
import {
  createRemoteBuildCache,
  findFilesWithPattern,
  formatArtifactName,
  getProjectRoot,
  nativeFingerprint,
  queryLocalBuildCache,
  spinner,
} from '@rnef/tools';
import color from 'picocolors';

export type FetchCachedBuildOptions = {
  buildVariant: string;
};

export async function fetchCachedBuild({
  buildVariant,
}: FetchCachedBuildOptions): Promise<LocalBuild | null> {
  const loader = spinner();
  loader.start('Looking for a local cached build');

  const root = getProjectRoot();
  const artifactName = await calculateArtifactName(buildVariant);

  const localBuild = queryLocalBuildCache(artifactName, { findBinary });
  if (localBuild != null) {
    loader.stop(`Found local cached build: ${color.cyan(localBuild.name)}`);
    return localBuild;
  }

  const remoteBuildCache = createRemoteBuildCache();
  if (!remoteBuildCache) {
    loader.stop(`No CI provider detected, skipping.`);
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

async function calculateArtifactName(buildVariant: string) {
  const root = getProjectRoot();
  const fingerprint = await nativeFingerprint(root, { platform: 'android' });
  return formatArtifactName({
    platform: 'android',
    build: buildVariant,
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
