import path from 'node:path';
import { RnefError } from '@rnef/tools';
import type { BuildFlags } from '../commands/build/buildOptions.js';
import { buildProject } from '../commands/build/buildProject.js';
import { getBuildSettings } from '../commands/run/getBuildSettings.js';
import type { RunFlags } from '../commands/run/runOptions.js';
import type { ApplePlatform, ProjectConfig } from '../types/index.js';
import { getConfiguration } from './getConfiguration.js';
import { getInfo } from './getInfo.js';
import type { PlatformSDK } from './getPlatformInfo.js';
import { getScheme } from './getScheme.js';
import { getValidProjectConfig } from './getValidProjectConfig.js';
import { installPodsIfNeeded } from './pods.js';

export async function buildApp({
  args,
  projectConfig,
  platformName,
  platformSDK,
  udid,
  projectRoot,
}: {
  args: RunFlags | BuildFlags;
  projectConfig: ProjectConfig;
  platformName: ApplePlatform;
  platformSDK: PlatformSDK;
  udid?: string;
  projectRoot: string;
}) {
  if ('binaryPath' in args && args.binaryPath) {
    return {
      appPath: args.binaryPath,
      // @todo Info.plist is hardcoded when reading from binaryPath
      infoPlistPath: path.join(args.binaryPath, 'Info.plist'),
      scheme: args.scheme,
      xcodeProject: projectConfig.xcodeProject,
      sourceDir: projectConfig.sourceDir,
    };
  }

  let { xcodeProject, sourceDir } = projectConfig;

  if (args.installPods) {
    await installPodsIfNeeded(
      projectRoot,
      platformName,
      sourceDir,
      args.newArch
    );
    // When the project is not a workspace, we need to get the project config again,
    // because running pods install might have generated .xcworkspace project.
    // This should be only case in new project.
    if (xcodeProject.isWorkspace === false) {
      const newProjectConfig = getValidProjectConfig(platformName, projectRoot);
      xcodeProject = newProjectConfig.xcodeProject;
      sourceDir = newProjectConfig.sourceDir;
    }
  }

  const info = await getInfo(xcodeProject, sourceDir);
  if (!info) {
    throw new RnefError('Failed to get Xcode project information');
  }
  const scheme = await getScheme(info.schemes, args.scheme, xcodeProject.name);
  const configuration = await getConfiguration(
    info.configurations,
    args.configuration
  );
  await buildProject({
    xcodeProject,
    sourceDir,
    platformName,
    udid,
    scheme,
    configuration,
    args,
  });
  const buildSettings = await getBuildSettings(
    xcodeProject,
    sourceDir,
    configuration,
    platformSDK,
    scheme,
    args.target
  );
  return {
    appPath: buildSettings.appPath,
    infoPlistPath: buildSettings.infoPlistPath,
    scheme: scheme,
    xcodeProject,
    sourceDir,
  };
}
