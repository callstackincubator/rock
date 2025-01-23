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

export type RemoteBuildCache = {
  name: string;
  promptCredentialsIfNeeded(): Promise<boolean>;
  query(artifactName: string): Promise<RemoteArtifact | null>;
  download(artifact: RemoteArtifact): Promise<LocalArtifact>;
};

type FormatArtifactNameParams = {
  platform: string;
  mode: string;
  hash: string;
};

/**
 * e.g. rnef-android-debug-1234567890
 */
export function formatArtifactName({
  platform,
  mode,
  hash,
}: FormatArtifactNameParams): string {
  return `rnef-${platform}-${mode}-${hash}`;
}

export function getLocalArtifactPath(artifactName: string) {
  return path.join(getCacheRootPath(), BUILD_CACHE_DIR, artifactName);
}
