import path from 'node:path';

export const LOCAL_BUILD_CACHE_FOLDER = 'build/cache';

export type BuildCacheConfig = {
  sourceDir: string;
  findBinary: (path: string) => string | null;
};

export type LocalBuild = {
  name: string;
  artifactPath: string;
  binaryPath: string;
};

export type RemoteBuild = {
  name: string;
  downloadUrl: string;
};

export type LocalBuildCache = {
  config: BuildCacheConfig;
  query: (this: LocalBuildCache, artifactName: string) => LocalBuild | null;
};

export type RemoteBuildCache = {
  name: string;
  config: BuildCacheConfig;

  query: (
    this: RemoteBuildCache,
    artifactName: string
  ) => Promise<RemoteBuild | null>;
  fetch: (
    this: RemoteBuildCache,
    artifact: RemoteBuild
  ) => Promise<LocalBuild | null>;
};

export function getLocalArtifactPath(sourceDir: string, artifactName: string) {
  return path.join(sourceDir, LOCAL_BUILD_CACHE_FOLDER, artifactName);
}
