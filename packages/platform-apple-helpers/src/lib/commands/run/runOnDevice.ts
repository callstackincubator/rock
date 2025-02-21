import type {
  SubprocessError,
  SupportedRemoteCacheProviders,
} from '@rnef/tools';
import { logger, spawn, spinner } from '@rnef/tools';
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

  const deviceCtlArgs = [
    'devicectl',
    'device',
    'install',
    'app',
    '--device',
    selectedDevice.udid,
    appPath,
  ];
  const loader = spinner();
  loader.start(`Installing and launching your app on ${selectedDevice.name}`);

  try {
    await spawn('xcrun', deviceCtlArgs, { cwd: sourceDir });
  } catch (error) {
    loader.stop(
      `Installing and launching your app on ${selectedDevice.name} [stopped]`
    );
    throw new Error(`Failed to install the app on the ${selectedDevice.name}`, {
      cause: (error as SubprocessError).stderr,
    });
  }

  loader.stop(`Installed the app on the ${selectedDevice.name}.`);
  return;
}
