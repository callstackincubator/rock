import { ApplePlatform, Device, XcodeProjectInfo } from '../../types/index.js';
import { logger } from '@callstack/rnef-tools';
import color from 'picocolors';
import { buildProject } from '../build/buildProject.js';
import { getBuildPath } from './getBuildPath.js';
import { getBuildSettings } from './getBuildSettings.js';
import { RunFlags } from './runOptions.js';
import spawn from 'nano-spawn';

export async function runOnDevice(
  selectedDevice: Device,
  platform: ApplePlatform,
  mode: string,
  scheme: string,
  xcodeProject: XcodeProjectInfo,
  sourceDir: string,
  args: RunFlags
) {
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
      mode,
      args
    );

    const buildSettings = await getBuildSettings(
      xcodeProject,
      sourceDir,
      mode,
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
