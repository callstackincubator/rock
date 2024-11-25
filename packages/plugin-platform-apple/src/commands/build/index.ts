import { BuildFlags } from './buildOptions.js';
import { buildProject } from './buildProject.js';
import { getXcodeProjectAndDir } from './getXcodeProjectAndDir.js';
import { BuilderCommand, ProjectConfig } from '../../types/index.js';

export const createBuild = async (
  platformName: BuilderCommand['platformName'],
  projectConfig: ProjectConfig,
  buildFlags: BuildFlags
) => {
  // TODO: add logic for installing Cocoapods based on @expo/fingerprint & pod-install package.

  const { xcodeProject, sourceDir } = getXcodeProjectAndDir(
    projectConfig,
    platformName
  );

  process.chdir(sourceDir);

  return buildProject(xcodeProject, platformName, undefined, buildFlags);
};
