import { color, logger, spawn } from '@rnef/tools';
import type { XcodeProjectInfo } from '../../types/index.js';
import type { PlatformSDK } from '../../utils/getPlatformInfo.js';

export type BuildSettings = {
  TARGET_BUILD_DIR: string;
  INFOPLIST_PATH: string;
  EXECUTABLE_FOLDER_PATH: string;
  FULL_PRODUCT_NAME: string;
};

export async function getBuildSettings(
  xcodeProject: XcodeProjectInfo,
  sourceDir: string,
  configuration: string,
  platformSDK: PlatformSDK,
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
      platformSDK,
      '-configuration',
      configuration,
      '-showBuildSettings',
      '-json',
    ],
    { cwd: sourceDir }
  );

  const settings = JSON.parse(buildSettings);

  const targets = settings
    // skip React target if present; may happen in some older projects; @todo revisit
    .filter(({ target }: { target: string }) => target !== 'React')
    .map(({ target: settingsTarget }: { target: string }) => settingsTarget);

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
  logger.debug(`Selected target: ${selectedTarget}`);

  // Find app in all building settings - look for WRAPPER_EXTENSION: 'app',
  const targetIndex = targets.indexOf(selectedTarget);
  const targetSettings = settings[targetIndex].buildSettings;

  const wrapperExtension = targetSettings.WRAPPER_EXTENSION;

  if (wrapperExtension === 'app') {
    return settings[targetIndex].buildSettings;
  }

  return null;
}
