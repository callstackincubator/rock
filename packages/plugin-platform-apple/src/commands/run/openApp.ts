import { logger } from '@callstack/rnef-tools';
import color from 'picocolors';
import { getBuildPath } from './getBuildPath.js';
import { getBuildSettings } from './getBuildSettings.js';
import { XcodeProjectInfo } from '../../types/index.js';
import spawn from 'nano-spawn';

type Options = {
  buildOutput: string;
  xcodeProject: XcodeProjectInfo;
  mode: string;
  scheme: string;
  target?: string;
  binaryPath?: string;
};

export default async function openApp({
  buildOutput,
  xcodeProject,
  mode,
  scheme,
  target,
  binaryPath,
}: Options) {
  let appPath = binaryPath;

  const buildSettings = await getBuildSettings(
    xcodeProject,
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
