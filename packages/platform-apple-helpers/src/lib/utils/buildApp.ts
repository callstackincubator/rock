import path from 'node:path';
import { RnefError } from '@rnef/tools';
import type { BuildFlags } from '../commands/build/buildOptions.js';
import { buildProject } from '../commands/build/buildProject.js';
import { getBuildSettings } from '../commands/run/getBuildSettings.js';
import type { RunFlags } from '../commands/run/runOptions.js';
import type { ApplePlatform } from '../types/index.js';
import type { XcodeProjectInfo } from '../types/index.js';
import { getConfiguration } from './getConfiguration.js';
import { getInfo } from './getInfo.js';
import type { PlatformSDK } from './getPlatformInfo.js';
import { getScheme } from './getScheme.js';

export async function buildApp({
  args,
  xcodeProject,
  sourceDir,
  platformName,
  platformSDK,
  udid,
  selectedScheme,
}: {
  args: RunFlags | BuildFlags;
  xcodeProject: XcodeProjectInfo;
  sourceDir: string;
  platformName: ApplePlatform;
  platformSDK: PlatformSDK;
  udid?: string;
  selectedScheme?: string;
}) {
  if ('binaryPath' in args && args.binaryPath) {
    return {
      appPath: args.binaryPath,
      // @todo Info.plist is hardcoded when reading from binaryPath
      infoPlistPath: path.join(args.binaryPath, 'Info.plist'),
    };
  }

  const info = await getInfo(xcodeProject, sourceDir);
  if (!info) {
    throw new RnefError('Failed to get Xcode project information');
  }
  const scheme =
    selectedScheme ??
    (await getScheme(info.schemes, args.scheme, xcodeProject.name));
  const configuration = await getConfiguration(
    info.configurations,
    args.configuration
  );
  await buildProject({
    xcodeProject,
    sourceDir,
    platformName,
    udid,
    scheme,
    configuration,
    args,
  });
  return getBuildSettings(
    xcodeProject,
    sourceDir,
    configuration,
    platformSDK,
    scheme,
    args.target
  );
}
