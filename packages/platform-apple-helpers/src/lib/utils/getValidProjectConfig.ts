import { getProjectConfig } from '@react-native-community/cli-config-apple';
import type { IOSProjectParams } from '@react-native-community/cli-types';
import { RnefError } from '@rnef/tools';
import type { ApplePlatform, ProjectConfig } from '../types/index.js';

/**
 * Get the valid project config with non-null `xcodeProject` for the given Apple platform.
 * To be used before running commands or after installing pods.
 */
export function getValidProjectConfig(
  platformName: ApplePlatform,
  projectRoot: string,
  userConfig: IOSProjectParams = {},
): ProjectConfig {
  const newProjectConfig = getProjectConfig({ platformName })(
    projectRoot,
    userConfig,
  );
  if (!newProjectConfig || newProjectConfig.xcodeProject === null) {
    throw new RnefError('Failed to get Xcode project information');
  }
  return {
    sourceDir: newProjectConfig.sourceDir,
    xcodeProject: newProjectConfig.xcodeProject,
  };
}
