import * as fs from 'node:fs';
import { getLocalArtifactPath, getLocalBinaryPath } from './common.js';

export type LocalBuild = {
  name: string;
  artifactPath: string;
  binaryPath: string;
};

export function queryLocalBuildCache(artifactName: string): LocalBuild | null {
  const artifactPath = getLocalArtifactPath(artifactName);
  if (!fs.statSync(artifactPath, { throwIfNoEntry: false })?.isDirectory()) {
    return null;
  }
  const binaryPath = getLocalBinaryPath(artifactPath);
  if (binaryPath == null || !fs.existsSync(binaryPath)) {
    return null;
  }
  return {
    name: artifactName,
    artifactPath,
    binaryPath,
  };
}
