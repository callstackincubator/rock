import path from 'node:path';
import { getProjectRoot } from '../project.js';

export const LOCAL_BUILD_CACHE_DIRECTORY = '.rnef-build-cache';

export type RemoteArtifact = {
  name: string;
  downloadUrl: string;
};

export type LocalArtifact = {
  name: string;
  artifactPath: string;
};

export type RemoteBuildCache = {
  name: string;

  query: (
    this: RemoteBuildCache,
    artifactName: string
  ) => Promise<RemoteArtifact | null>;
  fetch: (
    this: RemoteBuildCache,
    artifact: RemoteArtifact
  ) => Promise<LocalArtifact>;
};

export function getLocalArtifactPath(artifactName: string) {
  const root = getProjectRoot();
  return path.join(root, LOCAL_BUILD_CACHE_DIRECTORY, artifactName);
}
