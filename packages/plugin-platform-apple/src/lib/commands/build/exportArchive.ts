import { logger, RnefError } from '@rnef/tools';
import { spinner } from '@clack/prompts';
import spawn, { SubprocessError } from 'nano-spawn';
import path from 'path';
import { existsSync, readdirSync } from 'fs';

export const exportArchive = async ({
  sourceDir,
  archivePath,
  scheme,
  mode,
}: {
  sourceDir: string;
  archivePath: string;
  scheme: string;
  mode: string;
}) => {
  const loader = spinner();

  loader.start('Exporting the archive...');
  const exportOptionsPlistPath = path.join(sourceDir, 'ExportOptions.plist');

  if (!existsSync(exportOptionsPlistPath)) {
    loader.stop('Failed to export the archive.', 1);
    throw new RnefError(
      `ExportOptions.plist not found, please create ${path.relative(
        process.cwd(),
        exportOptionsPlistPath
      )} file with valid configuration for Archive export.`
    );
  }

  const exportPath = path.join(sourceDir, '.rnef/export');
  const xcodebuildArgs = [
    '-exportArchive',
    '-archivePath',
    archivePath,
    '-exportPath',
    exportPath,
    '-exportOptionsPlist',
    exportOptionsPlistPath,
  ];

  try {
    let ipaFiles: string[] = [];

    const { output } = await spawn('xcodebuild', xcodebuildArgs, {
      cwd: sourceDir,
    });
    try {
      ipaFiles = readdirSync(exportPath).filter((file) =>
        file.endsWith('.ipa')
      );
    } catch {
      ipaFiles = [];
    }

    loader.stop(
      `Exported the archive for ${scheme} scheme in ${mode} mode to ${
        path.join(exportPath, ipaFiles[0]) ?? exportPath
      }`
    );
    return output;
  } catch (error) {
    logger.log('');
    logger.log((error as SubprocessError).stdout);
    logger.error((error as SubprocessError).stderr);
    loader.stop(
      'Running xcodebuild failed. Check the error message above for details.',
      1
    );
    throw new Error('Running xcodebuild failed');
  }
};
