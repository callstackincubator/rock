import chalk from 'chalk';
import { selectFromInteractiveMode } from '../../utils/selectFromInteractiveMode.js';
import { getInfo } from '../../utils/getInfo.js';
import { checkIfConfigurationExists } from '../../utils/checkIfConfigurationExists.js';
import type { BuildFlags } from './buildOptions.js';
import { getBuildConfigurationFromXcScheme } from '../../utils/getBuildConfigurationFromXcScheme.js';
import path from 'node:path';
import { getPlatformInfo } from './../../utils/getPlatformInfo.js';
import { ApplePlatform, XcodeProjectInfo } from '../../types/index.js';
import { logger } from '@callstack/rnef-tools';

export async function getConfiguration(
  xcodeProject: XcodeProjectInfo,
  sourceDir: string,
  args: BuildFlags,
  platformName: ApplePlatform
) {
  const info = getInfo(xcodeProject, sourceDir);

  if (args.mode) {
    checkIfConfigurationExists(info?.configurations ?? [], args.mode);
  }

  let scheme =
    args.scheme ||
    path.basename(xcodeProject.name, path.extname(xcodeProject.name));

  if (!info?.schemes?.includes(scheme)) {
    const { readableName } = getPlatformInfo(platformName);
    const fallbackScheme = `${scheme}-${readableName}`;

    if (info?.schemes?.includes(fallbackScheme)) {
      logger.warn(
        `Scheme "${chalk.bold(
          scheme
        )}" doesn't exist. Using fallback scheme "${chalk.bold(
          fallbackScheme
        )}"`
      );

      scheme = fallbackScheme;
    }
  }

  let mode =
    args.mode ||
    getBuildConfigurationFromXcScheme(scheme, 'Debug', sourceDir, info);

  // TODO: make it a default behaviour. if there's one option let's go with it.
  // make this behaviour better, even if there are two ask? also not to make this prompt too annoying
  const selection = await selectFromInteractiveMode({
    scheme,
    mode,
    info,
  });

  if (selection.scheme) {
    scheme = selection.scheme;
  }

  if (selection.mode) {
    mode = selection.mode;
  }

  logger.info(
    `Found Xcode ${
      xcodeProject.isWorkspace ? 'workspace' : 'project'
    } "${chalk.bold(xcodeProject.name)}"`
  );

  return { scheme, mode };
}
