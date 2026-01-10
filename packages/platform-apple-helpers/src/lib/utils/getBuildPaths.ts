import path from 'node:path';
import type { RequireAllOrNone } from '@rock-js/tools';
import { getCacheRootPath } from '@rock-js/tools';

export const getBuildPaths = (
  platformName: string,
  {
    cacheRootPathOverride,
  }: RequireAllOrNone<{
    cacheRootPathOverride: string;
  }> = {},
) => {
  const buildDir = path.join(
    cacheRootPathOverride ?? getCacheRootPath(),
    platformName,
  );

  return {
    buildDir,
    exportDir: path.join(buildDir, 'export'),
    archiveDir: path.join(buildDir, 'archive'),
    packageDir: path.join(buildDir, 'package'),
    derivedDataDir: path.join(buildDir, 'derivedData'),
  };
};
