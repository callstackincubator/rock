import spawn from 'nano-spawn';
import { ApplePlatform, XcodeProjectInfo } from '../../types/index.js';
import { buildProject } from '../build/buildProject.js';
import { getBuildPath } from './getBuildPath.js';
import { getBuildSettings } from './getBuildSettings.js';
import { RunFlags } from './runOptions.js';

export async function runOnMacCatalyst(
  platform: ApplePlatform,
  mode: string,
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
  const buildOutput = await buildProject(
    xcodeProject,
    sourceDir,
    platform,
    undefined,
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

  const appPath = getBuildPath(buildSettings, platform);
  const appProcess = spawn(`${appPath}/${scheme}`, [], {
    detached: true,
    stdio: 'ignore',
  });
  (await appProcess.nodeChildProcess).unref();
}
