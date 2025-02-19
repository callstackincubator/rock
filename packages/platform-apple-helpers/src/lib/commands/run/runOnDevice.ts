import type { SupportedRemoteCacheProviders } from '@rnef/tools';
import { color, logger, spawn } from '@rnef/tools';
import type {
  ApplePlatform,
  Device,
  XcodeProjectInfo,
} from '../../types/index.js';
import { buildProject } from '../build/buildProject.js';
import { fetchCachedBuild } from './fetchCachedBuild.js';
import { getBuildPath } from './getBuildPath.js';
import { getBuildSettings } from './getBuildSettings.js';
import type { RunFlags } from './runOptions.js';

export async function runOnDevice(
  selectedDevice: Device,
  platform: ApplePlatform,
  configuration: string,
  scheme: string,
  xcodeProject: XcodeProjectInfo,
  sourceDir: string,
  remoteCacheProvider: SupportedRemoteCacheProviders | undefined,
  args: RunFlags
) {
  if (!args.binaryPath && args.remoteCache) {
    const cachedBuild = await fetchCachedBuild({
      distribution: 'device',
      configuration: 'Release', // Remote debug builds make no sense, do they?
      remoteCacheProvider,
    });
    if (cachedBuild) {
      // @todo replace with a more generic way to pass binary path
      args.binaryPath = cachedBuild.binaryPath;
    }
  }

  try {
    await spawn('ios-deploy', ['--version']);
  } catch {
    throw new Error(
      `Failed to install the app on the device because we couldn't execute the "ios-deploy" command. Please install it by running "${color.bold(
        'brew install ios-deploy'
      )}" and try again.`
    );
  }

  let buildOutput, appPath;
  if (!args.binaryPath) {
    buildOutput = await buildProject(
      xcodeProject,
      sourceDir,
      platform,
      selectedDevice.udid,
      scheme,
      configuration,
      args
    );

    const buildSettings = await getBuildSettings(
      xcodeProject,
      sourceDir,
      configuration,
      buildOutput,
      scheme
    );

    if (!buildSettings) {
      throw new Error('Failed to get build settings for your project');
    }

    appPath = getBuildPath(buildSettings, platform);
  } else {
    appPath = args.binaryPath;
  }

  const iosDeployInstallArgs = [
    '--bundle',
    appPath,
    '--id',
    selectedDevice.udid,
    '--justlaunch',
  ];

  logger.info(`Installing and launching your app on ${selectedDevice.name}`);

  try {
    await spawn('ios-deploy', iosDeployInstallArgs, { stdio: 'inherit' });
  } catch (error) {
    throw new Error(
      `Failed to install the app on the device with "ios-deploy": ${error}`
    );
  }

  return logger.success('Installed the app on the device.');
}
