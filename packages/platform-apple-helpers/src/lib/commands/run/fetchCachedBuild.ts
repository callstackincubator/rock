import fs from 'node:fs';
import path from 'node:path';
import type { SupportedRemoteCacheProviders } from '@rnef/tools';
import {
  color,
  createRemoteBuildCache,
  findDirectoriesWithPattern,
  findFilesWithPattern,
  formatArtifactName,
  type LocalBuild,
  logger,
  nativeFingerprint,
  queryLocalBuildCache,
  spinner,
} from '@rnef/tools';
import * as tar from 'tar';

export type Distribution = 'simulator' | 'device';

type FetchCachedBuildOptions = {
  distribution: Distribution;
  configuration: string;
  remoteCacheProvider: SupportedRemoteCacheProviders | undefined | null;
  root: string;
  fingerprintOptions: {
    extraSources: string[];
    ignorePaths: string[];
  };
};

export async function fetchCachedBuild({
  distribution,
  configuration,
  remoteCacheProvider,
  root,
  fingerprintOptions,
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

  const artifactName = await calculateArtifactName({
    distribution,
    configuration,
    root,
    fingerprintOptions,
  });

  const localBuild = queryLocalBuildCache(artifactName, {
    findBinary: (path) => findBinary(distribution, path),
  });
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
  await extractArtifactTarballIfNeeded(fetchedBuild.path);
  const binaryPath = findBinary(distribution, fetchedBuild.path);
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

async function calculateArtifactName({
  distribution,
  configuration,
  root,
  fingerprintOptions,
}: Omit<FetchCachedBuildOptions, 'remoteCacheProvider'>) {
  const fingerprint = await nativeFingerprint(root, {
    platform: 'ios',
    ...fingerprintOptions,
  });

  return formatArtifactName({
    platform: 'ios',
    distribution,
    build: configuration,
    hash: fingerprint.hash,
  });
}

function findBinary(distribution: Distribution, path: string): string | null {
  return distribution === 'device'
    ? findDeviceBinary(path)
    : findSimulatorBinary(path);
}

function findSimulatorBinary(path: string): string | null {
  const apps = findDirectoriesWithPattern(path, /\.app$/);
  if (apps.length === 0) {
    return null;
  }

  logger.debug(
    `Found simulator binaries (*.app): ${apps.join(
      ', '
    )}. Picking the first one: ${apps[0]}.`
  );
  return apps[0];
}

function findDeviceBinary(path: string): string | null {
  const ipas = findFilesWithPattern(path, /\.ipa$/);
  if (ipas.length === 0) {
    return null;
  }

  logger.debug(
    `Found device binaries (*.ipa): ${ipas.join(
      ', '
    )}. Picking the first one: ${ipas[0]}.`
  );
  return ipas[0];
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
