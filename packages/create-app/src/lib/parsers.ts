import path from 'node:path';

export type PackageInfo = {
  packageName: string;
  targetDir: string;
};

export function parsePackageInfo(input: string): PackageInfo {
  const targetDir = input.trim().replace(/\/+$/g, '');

  return {
    packageName: targetDir.startsWith('@')
      ? targetDir
      : path.basename(targetDir),
    targetDir,
  };
}

export type PackageManagerInfo = {
  name: string;
  version: string;
};

export function parsePackageManagerFromUserAgent(
  userAgent: string | undefined
): PackageManagerInfo | undefined {
  if (!userAgent) {
    return undefined;
  }

  const pkgSpec = userAgent.split(' ')[0];
  const pkgSpecArr = pkgSpec.split('/');

  return {
    name: pkgSpecArr[0],
    version: pkgSpecArr[1],
  };
}
