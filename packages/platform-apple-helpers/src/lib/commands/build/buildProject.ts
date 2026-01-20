import path from 'node:path';
import { color, logger, RockError } from '@rock-js/tools';
import type { ApplePlatform, XcodeProjectInfo } from '../../types/index.js';
import { getBuildPaths } from '../../utils/getBuildPaths.js';
import { runXcodebuild } from '../../utils/runXcodebuild.js';
import { supportedPlatforms } from '../../utils/supportedPlatforms.js';
import type { RunFlags } from '../run/runOptions.js';
import type { BuildFlags } from './buildOptions.js';

export const buildProject = async ({
  xcodeProject,
  sourceDir,
  platformName,
  scheme,
  configuration,
  destinations,
  args,
}: {
  xcodeProject: XcodeProjectInfo;
  sourceDir: string;
  platformName: ApplePlatform;
  scheme: string;
  configuration: string;
  destinations: string[];
  args: RunFlags | BuildFlags;
}): Promise<void> => {
  if (!supportedPlatforms[platformName]) {
    throw new RockError(
      `Unknown platform: ${platformName}. Please, use one of: ${Object.values(
        supportedPlatforms,
      ).join(', ')}.`,
    );
  }

  const xcodebuildArgs = [
    xcodeProject.isWorkspace ? '-workspace' : '-project',
    xcodeProject.name,
    ...(args.buildFolder ? ['-derivedDataPath', args.buildFolder] : []),
    '-configuration',
    configuration,
    '-scheme',
    scheme,
    ...destinations.flatMap((destination) => ['-destination', destination]),
  ];

  if (args.archive) {
    const { archiveDir } = getBuildPaths(platformName);
    const archiveName = `${xcodeProject.name.replace(
      '.xcworkspace',
      '',
    )}.xcarchive`;

    xcodebuildArgs.push(
      '-archivePath',
      path.join(archiveDir, archiveName),
      'archive',
    );
  }

  if (args.extraParams) {
    xcodebuildArgs.push(...args.extraParams);
  }

  logger.log(`Build Settings:
Scheme          ${color.bold(scheme)}
Configuration   ${color.bold(configuration)}`);

  const { errorSummary } = await runXcodebuild(xcodebuildArgs, {
    cwd: sourceDir,
  });

  if (errorSummary) {
    if (!xcodeProject.isWorkspace) {
      logger.error(
        `If your project uses CocoaPods, make sure to install pods with "pod install" in ${sourceDir} directory.`,
      );
    }

    throw new RockError('Failed to build the project', {
      cause: errorSummary,
    });
  }
};
