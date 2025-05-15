import fs from 'node:fs';
import path from 'node:path';
import { nativeFingerprint } from '../fingerprint/index.js';
import { getCacheRootPath } from '../project.js';
import type { spinner } from '../prompts.js';

export const BUILD_CACHE_DIR = 'remote-build';

export type SupportedRemoteCacheProviders = 'github-actions';

export type RemoteArtifact = {
  name: string;
  url: string;
  id?: string;
};

export type LocalArtifact = {
  name: string;
  path: string;
};

/**
 * Interface for implementing remote build cache providers.
 * Remote cache providers allow storing and retrieving native build artifacts (e.g. APK, IPA)
 * from remote storage like S3, GitHub Artifacts etc.
 */
export interface RemoteBuildCache {
  /** Unique identifier for this cache provider, will be displayed in logs */
  name: string;

  /**
   * List available artifacts matching the given name pattern
   * @param artifactName - Passed after fingerprinting the build, e.g. `rnef-android-debug-1234567890` for android in debug variant
   * @param limit - Optional maximum number of artifacts to return
   * @returns Array of matching remote artifacts, or null if none found
   */
  list({
    artifactName,
    limit,
  }: {
    artifactName: string | undefined;
    limit?: number;
  }): Promise<RemoteArtifact[] | null>;

  /**
   * Download a remote artifact to local storage
   * @param artifact - Remote artifact to download, as returned by `list` method
   * @param loader - Optional progress indicator
   * @returns Local artifact info after download
   */
  download({
    artifact,
    loader,
  }: {
    artifact: RemoteArtifact;
    loader?: ReturnType<typeof spinner>;
  }): Promise<LocalArtifact>;

  /**
   * Delete a remote artifact
   * @param artifact - Remote artifact to delete, as returned by `list` method
   * @param loader - Optional progress indicator
   * @returns True if deletion was successful
   */
  delete({
    artifact,
    loader,
  }: {
    artifact: RemoteArtifact;
    loader?: ReturnType<typeof spinner>;
  }): Promise<boolean>;

  /**
   * Upload a local artifact to remote storage
   * @param artifact - Local artifact to upload, as returned by `download` method
   * @param loader - Optional progress indicator
   * @returns Remote artifact info if upload successful, null otherwise
   */
  upload({
    artifact,
    loader,
  }: {
    artifact: LocalArtifact;
    loader?: ReturnType<typeof spinner>;
  }): Promise<RemoteArtifact | null>;
}

/**
 * Used formats:
 * - rnef-android-debug-1234567890
 * - rnef-ios-simulator-debug-1234567890
 * - rnef-ios-device-debug-1234567890
 */
export async function formatArtifactName({
  platform,
  traits,
  root,
  fingerprintOptions,
}: {
  platform: 'ios' | 'android';
  traits: string[];
  root: string;
  fingerprintOptions: { extraSources: string[]; ignorePaths: string[] };
}): Promise<string> {
  const { hash } = await nativeFingerprint(root, {
    platform,
    ...fingerprintOptions,
  });
  return `rnef-${platform}-${traits.join('-')}-${hash}`;
}

export function getLocalArtifactPath(artifactName: string) {
  return path.join(getCacheRootPath(), BUILD_CACHE_DIR, artifactName);
}

export function getLocalBinaryPath(artifactPath: string) {
  let binaryPath: string | null = null;
  const files = fs.readdirSync(artifactPath);

  // assume there is only one binary in the artifact
  for (const file of files) {
    // skip hidden files such as .DS_Store
    if (file.startsWith('.')) {
      continue;
    }
    if (file) {
      binaryPath = path.join(artifactPath, file);
      break;
    }
  }

  return binaryPath;
}
