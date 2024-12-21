import {
  downloadGitHubArtifact,
  fetchGitHubArtifactsByName,
  findFilesWithPattern,
  formatArtifactName,
  getProjectRoot,
  hasGitHubToken,
  logger,
  nativeFingerprint,
} from '@rnef/tools';
import { CachedBuild } from './runAndroid.js';
import { log, spinner } from '@clack/prompts';
import path from 'node:path';
import color from 'picocolors';
import fs from 'node:fs';

// TODO: pass relevant build variables
export async function fetchCachedBuild(
  sourceDir: string,
  mode: string
): Promise<CachedBuild | null> {
  if (!hasGitHubToken()) {
    log.warn(
      'No GitHub token found, skipping cached build. Set GITHUB_TOKEN environment variable to use cached builds.'
    );
    return null;
  }

  const loader = spinner();
  loader.start('Looking for a local cached build');

  const root = getProjectRoot();
  const fingerprint = await nativeFingerprint(root, { platform: 'android' });
  const artifactName = formatArtifactName({
    platform: 'android',
    mode,
    hash: fingerprint.hash,
  });
  const artifactPath = path.join(sourceDir, 'build/cache', artifactName);

  if (fs.existsSync(artifactPath)) {
    const localBinaryPath = findAndroidBinary(artifactPath);
    if (fs.existsSync(localBinaryPath)) {
      loader.stop(
        `Found local cached build: ${color.cyan(
          path.relative(root, localBinaryPath)
        )}.`
      );
      return {
        fingerprint: fingerprint.hash,
        artifactName,
        artifactPath,
        binaryPath: localBinaryPath,
      };
    }
  }

  loader.message('Looking for a cached build on GitHub');
  const artifacts = await fetchGitHubArtifactsByName(artifactName);
  if (artifacts.length === 0) {
    loader.stop(`No cached build found for hash ${fingerprint.hash}.`);
    return null;
  }

  loader.message('Downloading cached build');
  await downloadGitHubArtifact(artifacts[0], artifactPath);
  loader.stop(
    `Downloaded cached build: ${color.cyan(path.relative(root, artifactPath))}.`
  );

  const binaryPath = findAndroidBinary(artifactPath);
  logger.debug(`Cached build path: ${binaryPath}`);

  return {
    fingerprint: fingerprint.hash,
    artifactName,
    artifactPath,
    binaryPath,
  };
}

function findAndroidBinary(artifactPath: string): string {
  const apks = findFilesWithPattern(artifactPath, /\.apk$/);
  if (apks.length > 0) {
    return apks[0];
  }

  const aabs = findFilesWithPattern(artifactPath, /\.aab$/);
  if (aabs.length > 0) {
    return aabs[0];
  }

  throw new Error('No Android binary found in the artifact');
}
