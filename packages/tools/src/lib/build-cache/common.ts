import path from 'node:path';
import { getCacheRootPath } from '../project.js';

export const BUILD_CACHE_DIR = 'remote-build';

export type RemoteArtifact = {
  name: string;
  downloadUrl: string;
};

export type LocalArtifact = {
  name: string;
  path: string;
};

type RepoDetails = {
  url: string;
  owner: string;
  repository: string;
};

export type RemoteBuildCache = {
  name: string;
  repoDetails: RepoDetails | null;
  detectRepoDetails(): void;
  query(artifactName: string): Promise<RemoteArtifact | null>;
  download(artifact: RemoteArtifact): Promise<LocalArtifact>;
};

type FormatArtifactNameParams = {
  platform: string;
  distribution?: string;
  mode: string;
  hash: string;
};

/**
 * Used formats:
 * - rnef-android-debug-1234567890
 * - rnef-ios-simulator-debug-1234567890
 * - rnef-ios-device-debug-1234567890
 */
export function formatArtifactName({
  platform,
  distribution,
  mode,
  hash,
}: FormatArtifactNameParams): string {
  return `rnef-${platform}${
    distribution ? `-${distribution}` : ''
  }-${mode}-${hash}`;
}

export function getLocalArtifactPath(artifactName: string) {
  return path.join(getCacheRootPath(), BUILD_CACHE_DIR, artifactName);
}
