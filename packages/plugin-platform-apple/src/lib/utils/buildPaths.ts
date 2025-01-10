import path from 'node:path';
import { getProjectRoot } from '@rnef/tools';

export const getBuildPaths = (platformName: string) => {
  const rootDir = getProjectRoot(process.cwd());

  const buildDir = path.join(rootDir, '.rnef', platformName);

  return {
    buildDir,
    exportDir: path.join(buildDir, 'export'),
    archiveDir: path.join(buildDir, 'archive'),
    derivedDir: path.join(buildDir, 'derived'),
  };
};
