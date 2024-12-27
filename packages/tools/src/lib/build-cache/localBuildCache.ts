import * as fs from 'node:fs';
import {
  BuildCacheConfig,
  getLocalArtifactPath,
  LocalBuildCache,
  LocalBuild,
} from './common.js';

export function queryLocalBuild(
  this: LocalBuildCache,
  artifactName: string
): LocalBuild | null {
  const { sourceDir, findBinary } = this.config;

  const artifactPath = getLocalArtifactPath(sourceDir, artifactName);
  if (!fs.statSync(artifactPath, { throwIfNoEntry: false })?.isDirectory()) {
    return null;
  }

  const binaryPath = findBinary(artifactPath);
  if (binaryPath == null || !fs.existsSync(binaryPath)) {
    return null;
  }

  return {
    name: artifactName,
    artifactPath: artifactPath,
    binaryPath,
  };
}

export function createLocalBuildCache(
  config: BuildCacheConfig
): LocalBuildCache {
  return {
    config,
    query: queryLocalBuild,
  };
}
