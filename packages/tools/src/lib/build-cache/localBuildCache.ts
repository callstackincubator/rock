import * as fs from 'node:fs';
import { getLocalArtifactPath } from './common.js';

export type LocalBuildCacheConfig = {
  findBinary: (path: string) => string | null;
};

export type LocalBuild = {
  name: string;
  artifactPath: string;
  binaryPath: string;
};

export function queryLocalBuildCache(
  artifactName: string,
  { findBinary }: LocalBuildCacheConfig
): LocalBuild | null {
  const artifactPath = getLocalArtifactPath(artifactName);
  if (!fs.statSync(artifactPath, { throwIfNoEntry: false })?.isDirectory()) {
    return null;
  }

  const binaryPath = findBinary(artifactPath);
  if (binaryPath == null || !fs.existsSync(binaryPath)) {
    return null;
  }

  return {
    name: artifactName,
    artifactPath,
    binaryPath,
  };
}
