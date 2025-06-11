import type { SubprocessError } from '@rnef/tools';
import { color, RnefError, spawn, spinner } from '@rnef/tools';
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
}): Promise<{ ipaPath: string }> => {
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

    await spawn('xcodebuild', xcodebuildArgs, {
      cwd: sourceDir,
      stdio: 'pipe',
    });
    try {
      ipaFiles = readdirSync(exportDir).filter((file) => file.endsWith('.ipa'));
    } catch {
      ipaFiles = [];
    }

    loader.stop(
      `Archive available at: ${color.cyan(
        path.join(exportDir, ipaFiles[0]) ?? exportDir
      )}`
    );
    return { ipaPath: path.join(exportDir, ipaFiles[0]) };
  } catch (error) {
    loader.stop('Running xcodebuild failed.', 1);
    throw new Error('Running xcodebuild failed', {
      cause: (error as SubprocessError).stderr,
    });
  }
};
