import { logger } from '@rnef/tools';
import spawn from 'nano-spawn';
import color from 'picocolors';
import type { XcodeProjectInfo } from '../../types/index.js';

export type BuildSettings = {
  TARGET_BUILD_DIR: string;
  INFOPLIST_PATH: string;
  EXECUTABLE_FOLDER_PATH: string;
  FULL_PRODUCT_NAME: string;
};

export async function getBuildSettings(
  xcodeProject: XcodeProjectInfo,
  sourceDir: string,
  mode: string,
  buildOutput: string,
  scheme: string,
  target?: string
): Promise<BuildSettings | null> {
  const { stdout: buildSettings } = await spawn(
    'xcodebuild',
    [
      xcodeProject.isWorkspace ? '-workspace' : '-project',
      xcodeProject.name,
      '-scheme',
      scheme,
      '-sdk',
      getPlatformName(buildOutput),
      '-configuration',
      mode,
      '-showBuildSettings',
      '-json',
    ],
    { cwd: sourceDir }
  );

  const settings = JSON.parse(buildSettings);

  const targets = settings.map(
    ({ target: settingsTarget }: { target: string }) => settingsTarget
  );

  let selectedTarget = targets[0];

  if (target) {
    if (!targets.includes(target)) {
      logger.info(
        `Target ${color.bold(target)} not found for scheme ${color.bold(
          scheme
        )}, automatically selected target ${color.bold(selectedTarget)}`
      );
    } else {
      selectedTarget = target;
    }
  }

  // Find app in all building settings - look for WRAPPER_EXTENSION: 'app',
  const targetIndex = targets.indexOf(selectedTarget);
  const targetSettings = settings[targetIndex].buildSettings;

  const wrapperExtension = targetSettings.WRAPPER_EXTENSION;

  if (wrapperExtension === 'app') {
    return settings[targetIndex].buildSettings;
  }

  return null;
}

function getPlatformName(buildOutput: string) {
  // Xcode can sometimes escape `=` with a backslash or put the value in quotes
  const platformNameMatch = /export PLATFORM_NAME\\?="?(\w+)"?$/m.exec(
    buildOutput
  );
  if (!platformNameMatch) {
    throw new Error(
      'Couldn\'t find "PLATFORM_NAME" variable in xcodebuild output. Please report this issue and run your project with Xcode instead.'
    );
  }
  return platformNameMatch[1];
}
