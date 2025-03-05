import { RnefError, spawn, spinner } from '@rnef/tools';
import { existsSync, readdirSync } from 'fs';
import path from 'path';
import { getBuildPaths } from '../../utils/buildPaths.js';

export const exportArchive = async ({
  sourceDir,
  archivePath,
  scheme,
  configuration,
  platformName,
  exportExtraParams,
  exportOptionsPlist
}: {
  sourceDir: string;
  archivePath: string;
  scheme: string;
  configuration: string;
  platformName: string;
  exportExtraParams: string[];
  exportOptionsPlist?: string;
}) => {
  const loader = spinner();

  loader.start('Exporting the archive...');
  const exportOptionsPlistPath = path.join(sourceDir, exportOptionsPlist ?? 'ExportOptions.plist');

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
    });
    try {
      ipaFiles = readdirSync(exportDir).filter((file) => file.endsWith('.ipa'));
    } catch {
      ipaFiles = [];
    }

    loader.stop(
      `Exported the archive for ${scheme} scheme in ${configuration} configuration to ${
        path.join(exportDir, ipaFiles[0]) ?? exportDir
      }`
    );
    return output;
  } catch (error) {
    loader.stop(
      'Running xcodebuild failed. Check the error message above for details.',
      1
    );
    throw new Error('Running xcodebuild failed', { cause: error });
  }
};
