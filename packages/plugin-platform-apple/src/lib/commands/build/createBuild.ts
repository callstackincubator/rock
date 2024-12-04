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
  // @todo replace chdir with running the command in the {cwd: sourceDir}
  process.chdir(sourceDir);

  const { scheme, mode } = args.interactive
    ? await selectFromInteractiveMode(xcodeProject, args.scheme, args.mode)
    : await getConfiguration(
        xcodeProject,
        args.scheme,
        args.mode,
        platformName
      );

  try {
    await buildProject(
      xcodeProject,
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
}
