import {
  downloadGitHubArtifact,
  fetchGitHubArtifactsByName,
  findDirectoriesWithPattern,
  formatArtifactName,
  getProjectRoot,
  hasGitHubToken,
  nativeFingerprint,
} from '@rnef/tools';
import { log, spinner } from '@clack/prompts';
import path from 'node:path';
import color from 'picocolors';
import fs from 'node:fs';
import * as tar from 'tar';

const ciHelpers = {
  github: {
    downloadArtifact: downloadGitHubArtifact,
    fetchArtifactsByName: fetchGitHubArtifactsByName,
    hasToken: hasGitHubToken,
  },
} as const;

const ciHumanReadableNames = {
  github: {
    displayName: 'GitHub',
    tokenName: 'GITHUB_TOKEN',
  },
};

export type CachedBuild = {
  fingerprint: string;
  artifactName: string;
  artifactPath: string;
  binaryPath: string;
};

export type FetchCachedBuildOptions = {
  ci: 'github';
  sourceDir: string;
  mode: string;
};

// TODO: pass relevant build variables
export async function fetchCachedBuild({
  ci,
  sourceDir,
  mode,
}: FetchCachedBuildOptions): Promise<CachedBuild | null> {
  const downloadArtifact = ciHelpers[ci].downloadArtifact;
  const fetchArtifactsByName = ciHelpers[ci].fetchArtifactsByName;
  const hasToken = ciHelpers[ci].hasToken;
  const { displayName, tokenName } = ciHumanReadableNames[ci];

  if (!hasToken()) {
    log.warn(
      `No ${displayName} token found, skipping cached build. Set ${tokenName} environment variable to use cached builds.`
    );
    return null;
  }

  const loader = spinner();
  loader.start('Looking for a local cached build');

  const root = getProjectRoot();
  const fingerprint = await nativeFingerprint(root, { platform: 'ios' });
  const artifactName = formatArtifactName({
    platform: 'ios',
    mode,
    hash: fingerprint.hash,
  });
  const artifactPath = path.join(sourceDir, 'build/cache', artifactName);

  if (fs.existsSync(artifactPath)) {
    const localBinaryPath = findIosBinary(artifactPath);
    if (fs.existsSync(localBinaryPath)) {
      loader.stop(
        `Found local cached build: ${color.cyan(
          path.relative(root, localBinaryPath)
        )}`
      );
      return {
        fingerprint: fingerprint.hash,
        artifactName,
        artifactPath,
        binaryPath: localBinaryPath,
      };
    }
  }

  loader.message(`Looking for a cached build on ${displayName}`);
  const artifacts = await fetchArtifactsByName(artifactName);
  if (artifacts.length === 0) {
    loader.stop(`No cached build found for hash ${fingerprint.hash}.`);
    return null;
  }

  loader.message('Downloading cached build');
  await downloadArtifact(artifacts[0].downloadUrl, artifactPath);
  loader.stop(
    `Downloaded cached build: ${color.cyan(path.relative(root, artifactPath))}.`
  );

  // GitHub artifact for iOS is a tar.gz file (contained in the downloaded .zip file).
  // The reason for this is that GitHub upload-artifact  drop execute file permission during packing to zip,
  // so HelloWorld.app (and it's contents) is not executable.
  // The recommended workaround is to pack to .tar.gz first.
  // See: https://github.com/actions/upload-artifact?tab=readme-ov-file#permission-loss
  const tarPath = path.join(artifactPath, 'app.tar.gz');
  if (fs.existsSync(tarPath)) {
    await tar.extract({
      file: tarPath,
      cwd: artifactPath,
      gzip: true,
    });
    fs.unlinkSync(tarPath);
  }

  const binaryPath = findIosBinary(artifactPath);
  return {
    fingerprint: fingerprint.hash,
    artifactName,
    artifactPath,
    binaryPath,
  };
}

function findIosBinary(artifactPath: string): string {
  const apps = findDirectoriesWithPattern(artifactPath, /\.app$/);
  if (apps.length > 0) {
    return apps[0];
  }

  throw new Error('No iOS binary found in the artifact');
}
