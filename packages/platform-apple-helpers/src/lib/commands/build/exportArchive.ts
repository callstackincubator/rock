import type { SubprocessError } from '@rnef/tools';
import { RnefError, spawn, spinner } from '@rnef/tools';
import { existsSync, readdirSync } from 'fs';
import path from 'path';
import { getBuildPaths } from '../../utils/getBuildPaths.js';

export const exportArchive = async ({
  sourceDir,
  archivePath,
  platformName,
  exportExtraParams,
  exportOptionsPlist,
}: {
  sourceDir: string;
  archivePath: string;
  platformName: string;
  exportExtraParams: string[];
  exportOptionsPlist?: string;
}) => {
  const loader = spinner();

  loader.start('Exporting the archive...');
  const exportOptionsPlistPath = path.join(
    sourceDir,
    exportOptionsPlist ?? 'ExportOptions.plist'
  );

  if (!existsSync(exportOptionsPlistPath)) {
    loader.stop('Failed to export the archive.', 1);
    throw new RnefError(
      `ExportOptions.plist not found, please create ${path.relative(
        process.cwd(),
        exportOptionsPlistPath
      )} file with valid configuration for Archive export.`
    );
  }

  const { exportDir } = getBuildPaths(platformName);
  const xcodebuildArgs = [
    '-exportArchive',
    '-archivePath',
    archivePath,
    '-exportPath',
    exportDir,
    '-exportOptionsPlist',
    exportOptionsPlistPath,
    ...exportExtraParams,
  ];

  try {
    let ipaFiles: string[] = [];

    const { output } = await spawn('xcodebuild', xcodebuildArgs, {
      cwd: sourceDir,
      stdio: 'pipe',
    });
    try {
      ipaFiles = readdirSync(exportDir).filter((file) => file.endsWith('.ipa'));
    } catch {
      ipaFiles = [];
    }

    loader.stop(
      `Exported the archive to ${
        path.join(exportDir, ipaFiles[0]) ?? exportDir
      }`
    );
    return output;
  } catch (error) {
    loader.stop('Running xcodebuild failed.', 1);
    throw new Error('Running xcodebuild failed', {
      cause: (error as SubprocessError).stderr,
    });
  }
};
