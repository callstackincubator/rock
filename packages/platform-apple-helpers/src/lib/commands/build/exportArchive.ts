import { colorLink, logger, relativeToCwd, RockError } from '@rock-js/tools';
import { existsSync, readdirSync } from 'fs';
import path from 'path';
import { getBuildPaths } from '../../utils/getBuildPaths.js';
import { runXcodebuild } from '../../utils/runXcodebuild.js';

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
  const exportOptionsPlistPath = path.join(
    sourceDir,
    exportOptionsPlist ?? 'ExportOptions.plist',
  );

  if (!existsSync(exportOptionsPlistPath)) {
    throw new RockError(
      `ExportOptions.plist not found, please create ${colorLink(
        relativeToCwd(exportOptionsPlistPath),
      )} file with valid configuration for Archive export.`,
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

  let ipaFiles: string[] = [];

  const { errorSummary } = await runXcodebuild(xcodebuildArgs, {
    cwd: sourceDir,
  });
  try {
    ipaFiles = readdirSync(exportDir).filter((file) => file.endsWith('.ipa'));
  } catch {
    ipaFiles = [];
  }

  if (errorSummary) {
    throw new Error('Running xcodebuild failed', {
      cause: errorSummary,
    });
  } else {
    logger.success(
      `Archive available at: ${colorLink(
        path.join(exportDir, ipaFiles[0]) ?? exportDir,
      )}`,
    );
  }

  return { ipaPath: path.join(exportDir, ipaFiles[0]) };
};
