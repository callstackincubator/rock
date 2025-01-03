import path from 'node:path';
import { spinner } from '@clack/prompts';
import {
  createRemoteBuildCache,
  findFilesWithPattern,
  formatArtifactName,
  getProjectRoot,
  LocalBuild,
  nativeFingerprint,
  queryLocalBuildCache,
} from '@rnef/tools';
import color from 'picocolors';

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
  }

  const remoteBuildCache = createRemoteBuildCache();
  if (!remoteBuildCache) {
    loader.stop(`No CI provider detected, skipping.`);
    return null;
  }

  loader.message(`Looking for a cached build on ${remoteBuildCache.name}`);
  const remoteBuild = await remoteBuildCache.query(artifactName);
  if (!remoteBuild) {
    loader.stop(`No cached build found for "${artifactName}".`);
    return null;
  }

  loader.message(`Downloading cached build from ${remoteBuildCache.name}`);
  const fetchedBuild = await remoteBuildCache.download(remoteBuild);
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
  const fingerprint = await nativeFingerprint(root, { platform: 'android' });
  return formatArtifactName({
    platform: 'android',
    mode,
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
