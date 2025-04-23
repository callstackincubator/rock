import { projectConfig } from '@react-native-community/cli-config-android';
import type { AndroidProjectConfig } from '@react-native-community/cli-types';
import { RnefError } from '@rnef/tools';

export function getValidProjectConfig(
  projectRoot: string,
  pluginConfig?: AndroidProjectConfig
) {
  const androidConfig = projectConfig(projectRoot, pluginConfig);
  if (!androidConfig) {
    throw new RnefError('Android project not found.');
  }
  return androidConfig;
}
