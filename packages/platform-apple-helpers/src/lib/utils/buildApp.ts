import path from 'node:path';
import type { IOSProjectConfig } from '@react-native-community/cli-types';
import { RnefError } from '@rnef/tools';
import type { BuildFlags } from '../commands/build/buildOptions.js';
import { buildProject } from '../commands/build/buildProject.js';
import { getBuildSettings } from '../commands/run/getBuildSettings.js';
import type { RunFlags } from '../commands/run/runOptions.js';
import type { ApplePlatform, ProjectConfig } from '../types/index.js';
import { getGenericDestination } from './destionation.js';
import { getConfiguration } from './getConfiguration.js';
import { getInfo } from './getInfo.js';
import { getScheme } from './getScheme.js';
import { getValidProjectConfig } from './getValidProjectConfig.js';
import { installPodsIfNeeded } from './pods.js';

export async function buildApp({
  args,
  projectConfig,
  pluginConfig,
  platformName,
  udid,
  projectRoot,
  deviceName,
  reactNativePath,
}: {
  args: RunFlags | BuildFlags;
  projectConfig: ProjectConfig;
  pluginConfig?: IOSProjectConfig;
  platformName: ApplePlatform;
  udid?: string;
  deviceName?: string;
  projectRoot: string;
  reactNativePath: string;
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
      args.newArch,
      reactNativePath
    );
    // When the project is not a workspace, we need to get the project config again,
    // because running pods install might have generated .xcworkspace project.
    // This should be only case in new project.
    if (xcodeProject.isWorkspace === false) {
      const newProjectConfig = getValidProjectConfig(
        platformName,
        projectRoot,
        pluginConfig
      );
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
  const destinations = determineDestinations({
    args,
    platformName,
    udid,
    deviceName,
  });

  await buildProject({
    xcodeProject,
    sourceDir,
    platformName,
    scheme,
    configuration,
    destinations,
    args,
  });

  const buildSettings = await getBuildSettings(
    xcodeProject,
    sourceDir,
    platformName,
    configuration,
    destinations,
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

type DetermineDestinationsArgs = {
  args: RunFlags | BuildFlags;
  platformName: ApplePlatform;
  udid?: string;
  deviceName?: string;
};

function determineDestinations({
  args,
  platformName,
  udid,
  deviceName,
}: DetermineDestinationsArgs): string[] {
  if (args.destinations) {
    return args.destinations;
  }

  if (args.destinationXxx) {
    return [getGenericDestination(platformName, args.destinationXxx)];
  }

  if ('catalyst' in args && args.catalyst) {
    return ['platform=macOS,variant=Mac Catalyst'];
  }

  if (udid) {
    return [`id=${udid}`];
  }

  if (deviceName) {
    return [`name=${deviceName}`];
  }

  return [getGenericDestination(platformName, 'device')];
}
