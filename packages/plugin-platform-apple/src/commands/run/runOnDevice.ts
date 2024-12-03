import child_process from 'child_process';
import { ApplePlatform, Device, XcodeProjectInfo } from '../../types/index.js';
import { logger } from '@callstack/rnef-tools';
import color from 'picocolors';
import { buildProject } from '../build/buildProject.js';
import { getBuildPath } from './getBuildPath.js';
import { getBuildSettings } from './getBuildSettings.js';
import { RunFlags } from './runOptions.js';

export async function runOnDevice(
  selectedDevice: Device,
  platform: ApplePlatform,
  mode: string,
  scheme: string,
  xcodeProject: XcodeProjectInfo,
  args: RunFlags
) {
  if (args.binaryPath && selectedDevice.type === 'catalyst') {
    throw new Error(
      'binary-path was specified for catalyst device, which is not supported.'
    );
  }

  const isIOSDeployInstalled = child_process.spawnSync(
    'ios-deploy',
    ['--version'],
    { encoding: 'utf8' }
  );

  if (isIOSDeployInstalled.error) {
    throw new Error(
      `Failed to install the app on the device because we couldn't execute the "ios-deploy" command. Please install it by running "${color.bold(
        'brew install ios-deploy'
      )}" and try again.`
    );
  }

  if (selectedDevice.type === 'catalyst') {
    const buildOutput = await buildProject(
      xcodeProject,
      platform,
      selectedDevice.udid,
      scheme,
      mode,
      args
    );

    const buildSettings = await getBuildSettings(
      xcodeProject,
      mode,
      buildOutput,
      scheme
    );

    if (!buildSettings) {
      throw new Error('Failed to get build settings for your project');
    }

    const appPath = getBuildPath(buildSettings, platform, true);
    const appProcess = child_process.spawn(`${appPath}/${scheme}`, [], {
      detached: true,
      stdio: 'ignore',
    });
    appProcess.unref();
  } else {
    let buildOutput, appPath;
    if (!args.binaryPath) {
      buildOutput = await buildProject(
        xcodeProject,
        platform,
        selectedDevice.udid,
        scheme,
        mode,
        args
      );

      const buildSettings = await getBuildSettings(
        xcodeProject,
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

    const iosDeployOutput = child_process.spawnSync(
      'ios-deploy',
      iosDeployInstallArgs,
      { encoding: 'utf8' }
    );

    if (iosDeployOutput.error) {
      throw new Error(
        `Failed to install the app on the device. We've encountered an error in "ios-deploy" command: ${iosDeployOutput.error.message}`
      );
    }
  }

  return logger.success('Installed the app on the device.');
}
