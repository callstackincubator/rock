import { logger, RnefError } from '@rnef/tools';
import spawn from 'nano-spawn';
import color from 'picocolors';
import type { XcodeProjectInfo } from '../../types/index.js';
import { buildProject } from '../build/buildProject.js';
import { getBuildPath } from './getBuildPath.js';
import { getBuildSettings } from './getBuildSettings.js';
import type { RunFlags } from './runOptions.js';

export async function runOnMac(
  xcodeProject: XcodeProjectInfo,
  sourceDir: string,
  mode: string,
  scheme: string,
  args: RunFlags
) {
  const buildOutput = await buildProject(
    xcodeProject,
    sourceDir,
    'macos',
    undefined,
    scheme,
    mode,
    args
  );

  await openApp({
    buildOutput,
    xcodeProject,
    sourceDir,
    mode,
    scheme,
    target: args.target,
    binaryPath: args.binaryPath,
  });
}

type Options = {
  buildOutput: string;
  xcodeProject: XcodeProjectInfo;
  sourceDir: string;
  mode: string;
  scheme: string;
  target?: string;
  binaryPath?: string;
};

async function openApp({
  buildOutput,
  xcodeProject,
  sourceDir,
  mode,
  scheme,
  target,
  binaryPath,
}: Options) {
  let appPath = binaryPath;

  const buildSettings = await getBuildSettings(
    xcodeProject,
    sourceDir,
    mode,
    buildOutput,
    scheme,
    target
  );

  if (!buildSettings) {
    throw new RnefError('Failed to get build settings for your project');
  }

  if (!appPath) {
    appPath = getBuildPath(buildSettings, 'macos');
  }

  logger.debug(`Opening "${color.bold(appPath)}"`);

  try {
    await spawn('open', [appPath]);
  } catch (error) {
    throw new RnefError('Failed to launch the app', { cause: error });
  }
}
