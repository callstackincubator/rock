import path from 'node:path';
import { getProjectRoot } from '../project.js';

export const LOCAL_BUILD_CACHE_DIRECTORY = '.rnef/cache/remote-build';

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
  const root = getProjectRoot();
  return path.join(root, LOCAL_BUILD_CACHE_DIRECTORY, artifactName);
}
