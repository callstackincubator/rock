import fs from 'fs';
import path from 'path';
import packageJson from 'package-json';
import * as tar from 'tar';
import { getNameWithoutExtension, removeDirSync } from './fs.js';

export async function downloadTarballFromNpm(
  packageName: string,
  version = 'latest',
  targetDir: string
) {
  try {
    const metadata = await packageJson(packageName, { version });

    const tarballUrl = metadata['dist']?.tarball;
    if (!tarballUrl) {
      throw new Error('Tarball URL not found.');
    }

    console.log('tarballUrl', tarballUrl);
    const response = await fetch(tarballUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch package: ${response.statusText}`);
    }

    const tarballPath = path.join(
      targetDir,
      `${packageName.replace('/', '-')}.tgz`
    );
    // Write the tarball to disk
    const arrayBuffer = await response.arrayBuffer();
    fs.writeFileSync(tarballPath, Buffer.from(arrayBuffer));

    return tarballPath;
  } catch (error) {
    console.error(`Error downloading package`, error);
    throw error;
  }
}

/**
 * Extracts a tarball to a temporary directory and returns the path to the extracted directory
 * @param tarballPath - Path to the tarball to extract
 * @param targetDir - Parent directory where temp directory will be created in
 * @returns Path to the extracted directory
 */
// This automatically handles both .tgz and .tar files
export async function extractTarballToTempDirectory(
  targetDir: string,
  tarballPath: string
): Promise<string> {
  const tempFolder = path.join(
    getTarballTempDirectoryName(targetDir),
    `${getNameWithoutExtension(tarballPath)}-${Date.now()}`
  );
  fs.mkdirSync(tempFolder, { recursive: true });

  await tar.extract({
    file: tarballPath,
    cwd: tempFolder,
    strip: 1, // Remove top-level directory
  });

  return tempFolder;
}

export function clearTarballTempDirectory(targetDir: string) {
  removeDirSync(getTarballTempDirectoryName(targetDir));
}

function getTarballTempDirectoryName(targetDir: string) {
  return path.join(targetDir, '.tmp');
}
