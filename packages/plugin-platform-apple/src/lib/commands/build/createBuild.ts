import { BuildFlags } from './buildOptions.js';
import { buildProject } from './buildProject.js';
import {
  BuilderCommand,
  ProjectConfig,
  XcodeProjectInfo,
} from '../../types/index.js';
import { logger } from '@callstack/rnef-tools';
import { outro, cancel } from '@clack/prompts';
import path from 'path';
import { selectFromInteractiveMode } from '../../utils/selectFromInteractiveMode.js';
import { getConfiguration } from './getConfiguration.js';
import isInteractive from 'is-interactive';

export const createBuild = async (
  platformName: BuilderCommand['platformName'],
  projectConfig: ProjectConfig,
  args: BuildFlags
) => {
  // TODO: add logic for installing Cocoapods based on @expo/fingerprint & pod-install package.

  const { xcodeProject, sourceDir } = projectConfig;

  if (!xcodeProject) {
    logger.error(
      `Could not find Xcode project files in "${sourceDir}" folder. Please make sure that you have installed Cocoapods and "${sourceDir}" is a valid path`
    );
    process.exit(1);
  }

  normalizeArgs(args, xcodeProject);

  const { scheme, mode } = args.interactive
    ? await selectFromInteractiveMode(
        xcodeProject,
        sourceDir,
        args.scheme,
        args.mode
      )
    : await getConfiguration(
        xcodeProject,
        sourceDir,
        args.scheme,
        args.mode,
        platformName
      );

  try {
    await buildProject(
      xcodeProject,
      sourceDir,
      platformName,
      undefined,
      scheme,
      mode,
      args
    );
    outro('Success 🎉.');
  } catch {
    cancel('Command failed.');
  }
};

function normalizeArgs(args: BuildFlags, xcodeProject: XcodeProjectInfo) {
  if (!args.mode) {
    args.mode = 'Debug';
  }
  if (!args.scheme) {
    args.scheme = path.basename(
      xcodeProject.name,
      path.extname(xcodeProject.name)
    );
  }
  if (args.interactive && !isInteractive()) {
    logger.warn(
      'Interactive mode is not supported in non-interactive environments.'
    );
    args.interactive = false;
  }
}
