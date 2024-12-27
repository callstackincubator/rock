import {
  LocalBuild,
  createLocalBuildCache,
  createRemoteBuildCache,
  findFilesWithPattern,
  formatArtifactName,
  getProjectRoot,
  nativeFingerprint,
} from '@rnef/tools';
import { spinner } from '@clack/prompts';
import path from 'node:path';
import color from 'picocolors';

export async function fetchCachedBuild(
  sourceDir: string,
  mode: string
): Promise<LocalBuild | null> {
  const loader = spinner();
  loader.start('Looking for a local cached build');

  const root = getProjectRoot();
  const artifactName = await calculateArtifactName(mode);

  const localBuildCache = createLocalBuildCache({
    sourceDir,
    findBinary: findAndroidBinary,
  });
  const localCachedBuild = localBuildCache.query(artifactName);
  if (localCachedBuild != null) {
    loader.stop(
      `Found local cached build: ${color.cyan(
        path.relative(root, localCachedBuild.binaryPath)
      )}`
    );
    return localCachedBuild;
  }

  const remoteBuildCache = createRemoteBuildCache({
    sourceDir,
    findBinary: findAndroidBinary,
  });
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
  const fetchedBuild = await remoteBuildCache.fetch(remoteBuild);
  if (!fetchedBuild) {
    loader.stop(`No cached build found for "${artifactName}".`);
    return null;
  }

  loader.stop(
    `Downloaded cached build: ${color.cyan(
      path.relative(root, fetchedBuild.binaryPath)
    )}.`
  );

  return fetchedBuild;
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

function findAndroidBinary(path: string): string | null {
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
