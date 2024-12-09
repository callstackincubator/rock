import { logger } from '@callstack/rnef-tools';
import color from 'picocolors';
import spawn from 'nano-spawn';
import { getBuildPath } from './getBuildPath.js';
import { getBuildSettings } from './getBuildSettings.js';
import { XcodeProjectInfo } from '../../types/index.js';
import { buildProject } from '../build/buildProject.js';
import { RunFlags } from './runOptions.js';

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
    throw new Error('Failed to get build settings for your project');
  }

  if (!appPath) {
    appPath = getBuildPath(buildSettings, 'macos');
  }

  logger.debug(`Opening "${color.bold(appPath)}"`);

  try {
    await spawn('open', [appPath]);
  } catch (e) {
    logger.error('Failed to launch the app', e as string);
  }
}
