import { BuildFlags } from './buildOptions.js';
import { buildProject } from './buildProject.js';
import { BuilderCommand, ProjectConfig } from '../../types/index.js';
import { logger } from '@callstack/rnef-tools';
import { outro } from '@clack/prompts';

export const createBuild = async (
  platformName: BuilderCommand['platformName'],
  projectConfig: ProjectConfig,
  buildFlags: BuildFlags
) => {
  // TODO: add logic for installing Cocoapods based on @expo/fingerprint & pod-install package.

  const { xcodeProject, sourceDir } = projectConfig;

  if (!xcodeProject) {
    logger.error(
      `Could not find Xcode project files in "${sourceDir}" folder. Please make sure that you have installed Cocoapods and "${sourceDir}" is a valid path`
    );
    process.exit(1);
  }

  process.chdir(sourceDir);

  await buildProject(xcodeProject, platformName, undefined, buildFlags);
  outro('Success 🎉.');
};
