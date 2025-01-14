import fs from 'node:fs';
import path from 'node:path';
import { spinner } from '@clack/prompts';
import {
  createRemoteBuildCache,
  findDirectoriesWithPattern,
  findFilesWithPattern,
  formatArtifactName,
  getProjectRoot,
  type LocalBuild,
  logger,
  nativeFingerprint,
  queryLocalBuildCache,
} from '@rnef/tools';
import color from 'picocolors';
import * as tar from 'tar';

export type Distribution = 'simulator' | 'device';

export type FetchCachedBuildOptions = {
  distribution: Distribution;
  mode: string;
};

export async function fetchCachedBuild({
  distribution,
  mode,
}: FetchCachedBuildOptions): Promise<LocalBuild | null> {
  const loader = spinner();
  loader.start('Looking for a local cached build');

  const root = getProjectRoot();
  const artifactName = await calculateArtifactName({ distribution, mode });

  const localBuild = queryLocalBuildCache(artifactName, {
    findBinary: (path) => findBinary(distribution, path),
  });
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
  mode,
}: FetchCachedBuildOptions) {
  const root = getProjectRoot();
  const fingerprint = await nativeFingerprint(root, { platform: 'ios' });
  return formatArtifactName({
    platform: 'ios',
    distribution,
    mode,
    hash: fingerprint.hash,
  });
}

function findBinary(distribution: string, path: string): string | null {
  if (distribution === 'simulator') {
    const apps = findDirectoriesWithPattern(path, /\.app$/);
    if (apps.length > 0) {
      logger.debug(
        `Found simulator binaries (*.app): ${apps.join(
          ', '
        )}. Picking the first one: ${apps[0]}.`
      );
      return apps[0];
    }
  }

  if (distribution === 'device') {
    const ipas = findFilesWithPattern(path, /\.ipa$/);
    if (ipas.length > 0) {
      logger.debug(
        `Found device binaries (*.ipa): ${ipas.join(
          ', '
        )}. Picking the first one: ${ipas[0]}.`
      );
      return ipas[0];
    }
  }

  return null;
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
