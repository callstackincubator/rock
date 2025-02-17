import path from 'node:path';
import { getCacheRootPath } from '@rnef/tools';

export const getBuildPaths = (platformName: string) => {
  const buildDir = path.join(getCacheRootPath(), platformName);

  return {
    buildDir,
    exportDir: path.join(buildDir, 'export'),
    archiveDir: path.join(buildDir, 'archive'),
  };
};
