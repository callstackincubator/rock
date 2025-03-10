import { spawn } from '@rnef/tools';
import type { ApplePlatform, XcodeProjectInfo } from '../../types/index.js';
import { getSimulatorPlatformSDK } from '../../utils/getPlatformInfo.js';
import { buildProject } from '../build/buildProject.js';
import { getBuildPath } from './getBuildPath.js';
import { getBuildSettings } from './getBuildSettings.js';
import type { RunFlags } from './runOptions.js';

export async function runOnMacCatalyst(
  platform: ApplePlatform,
  configuration: string,
  scheme: string,
  xcodeProject: XcodeProjectInfo,
  sourceDir: string,
  args: RunFlags
) {
  if (args.binaryPath) {
    throw new Error(
      'The "--binary-path" flag is not supported for Mac Catalyst device.'
    );
  }
  await buildProject(
    xcodeProject,
    sourceDir,
    platform,
    undefined,
    scheme,
    configuration,
    args
  );

  const buildSettings = await getBuildSettings(
    xcodeProject,
    sourceDir,
    configuration,
    getSimulatorPlatformSDK(platform),
    scheme
  );

  if (!buildSettings) {
    throw new Error('Failed to get build settings for your project');
  }

  const appPath = getBuildPath(buildSettings, platform);
  const appProcess = spawn(`${appPath}/${scheme}`, [], {
    detached: true,
    stdio: 'ignore',
  });
  (await appProcess.nodeChildProcess).unref();
}
