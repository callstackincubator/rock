import path from 'node:path';
import type { IOSProjectConfig } from '@react-native-community/cli-types';
import {
  type FingerprintOptions,
  formatArtifactName,
  getInfoPlist,
  RockError,
  saveLocalBuildCache,
} from '@rock-js/tools';
import type { BuildFlags } from '../commands/build/buildOptions.js';
import { buildProject } from '../commands/build/buildProject.js';
import { getBuildSettings } from '../commands/run/getBuildSettings.js';
import type { RunFlags } from '../commands/run/runOptions.js';
import type { ApplePlatform, ProjectConfig } from '../types/index.js';
import { getGenericDestination } from './destination.js';
import { getConfiguration } from './getConfiguration.js';
import { getInfo } from './getInfo.js';
import { getScheme } from './getScheme.js';
import { getValidProjectConfig } from './getValidProjectConfig.js';
import { installPodsIfNeeded } from './pods.js';

type SharedBuildAppOptions = {
  args: RunFlags | BuildFlags;
  projectConfig: ProjectConfig;
  pluginConfig?: IOSProjectConfig;
  platformName: ApplePlatform;
  udid?: string;
  deviceName?: string;
  projectRoot: string;
  reactNativePath: string;
  binaryPath?: string;
  usePrebuiltRNCore?: number;
  skipCache?: boolean;
};

export async function buildApp({
  args,
  projectConfig,
  pluginConfig,
  platformName,
  udid,
  projectRoot,
  deviceName,
  reactNativePath,
  binaryPath,
  brownfield,
  artifactName,
  fingerprintOptions,
  deviceOrSimulator,
  usePrebuiltRNCore,
  skipCache,
}:
  | ({
      brownfield?: false;
      artifactName: string;
      deviceOrSimulator: string;
      fingerprintOptions: FingerprintOptions;
    } & SharedBuildAppOptions)
  | ({
      brownfield: true;
      // artifactName, deviceOrSimulator and fingerprintOptions are not used for brownfield builds
      artifactName?: string;
      deviceOrSimulator?: string;
      fingerprintOptions?: FingerprintOptions;
    } & SharedBuildAppOptions)) {
  if (binaryPath) {
    // @todo Info.plist is hardcoded when reading from binaryPath
    const infoPlistPath = path.join(binaryPath, 'Info.plist');
    const infoPlistJson = await getInfoPlist(infoPlistPath);
    const bundleIdentifier = infoPlistJson?.['CFBundleIdentifier'] ?? 'unknown';

    return {
      appPath: binaryPath,
      bundleIdentifier,
      infoPlistPath,
      scheme: args.scheme,
      xcodeProject: projectConfig.xcodeProject,
      sourceDir: projectConfig.sourceDir,
    };
  }
  let artifactNameToSave = artifactName;
  let { xcodeProject, sourceDir } = projectConfig;

  if (args.installPods) {
    const didInstallPods = await installPodsIfNeeded(
      projectRoot,
      platformName,
      sourceDir,
      args.newArch,
      reactNativePath,
      brownfield,
      usePrebuiltRNCore,
      skipCache,
    );
    // When the project is not a workspace, we need to get the project config again,
    // because running pods install might have generated .xcworkspace project.
    // This should be only case in new project.
    if (xcodeProject.isWorkspace === false) {
      const newProjectConfig = getValidProjectConfig(
        platformName,
        projectRoot,
        pluginConfig,
      );
      xcodeProject = newProjectConfig.xcodeProject;
      sourceDir = newProjectConfig.sourceDir;
    }

    if (
      artifactNameToSave &&
      fingerprintOptions &&
      deviceOrSimulator &&
      didInstallPods &&
      args.local
    ) {
      // After installing pods the fingerprint likely changes.
      // We update the artifact name to reflect the new fingerprint and store proper entry in the local cache.
      // Only do this for local builds. Remote builds need the fingerprint determined upfront to properly find the cached build before pods install.
      artifactNameToSave = await formatArtifactName({
        platform: 'ios',
        traits: [deviceOrSimulator, args.configuration ?? 'Debug'],
        root: projectRoot,
        fingerprintOptions,
        type: 'update',
      });
    }
  }

  const info = await getInfo(xcodeProject, sourceDir);
  if (!info) {
    throw new RockError('Failed to get Xcode project information');
  }

  const scheme = await getScheme(info.schemes, args.scheme, xcodeProject.name);
  const configuration = await getConfiguration(
    info.configurations,
    args.configuration,
  );
  const destinations = determineDestinations({
    destination: args.destination,
    isCatalyst: 'catalyst' in args && args.catalyst,
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

  const buildSettings = await getBuildSettings({
    xcodeProject,
    sourceDir,
    platformName,
    configuration,
    destinations,
    scheme,
    target: args.target,
    buildFolder: args.buildFolder,
  });

  if (artifactNameToSave) {
    saveLocalBuildCache(artifactNameToSave, buildSettings.appPath);
  }

  return {
    appPath: buildSettings.appPath,
    infoPlistPath: buildSettings.infoPlistPath,
    scheme: scheme,
    xcodeProject,
    sourceDir,
    bundleIdentifier: buildSettings.bundleIdentifier,
  };
}

function determineDestinations({
  destination,
  isCatalyst,
  platformName,
  udid,
  deviceName,
}: {
  destination?: string[];
  isCatalyst?: boolean;
  platformName: ApplePlatform;
  udid?: string;
  deviceName?: string;
}): string[] {
  if (isCatalyst) {
    return ['platform=macOS,variant=Mac Catalyst'];
  }
  if (udid) {
    return [`id=${udid}`];
  }
  if (deviceName) {
    return [`name=${deviceName}`];
  }
  if (destination && destination.length > 0) {
    return destination.map((destination) =>
      resolveDestination(destination, platformName),
    );
  }
  return [getGenericDestination(platformName, 'device')];
}

function resolveDestination(destination: string, platformName: ApplePlatform) {
  if (destination === 'device') {
    return getGenericDestination(platformName, 'device');
  }

  if (destination === 'simulator') {
    return getGenericDestination(platformName, 'simulator');
  }

  return destination;
}
