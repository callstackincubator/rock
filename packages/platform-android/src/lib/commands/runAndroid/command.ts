import { projectConfig } from '@react-native-community/cli-config-android';
import type { AndroidProjectConfig } from '@react-native-community/cli-types';
import type { PluginApi } from '@rnef/config';
import { RnefError } from '@rnef/tools';
import type { Flags } from './runAndroid.js';
import { runAndroid, runOptions } from './runAndroid.js';

export function registerRunCommand(
  api: PluginApi,
  pluginConfig?: AndroidProjectConfig
) {
  api.registerCommand({
    name: 'run:android',
    description:
      'Builds your app and starts it on a connected Android emulator or a device.',
    action: async (args) => {
      const projectRoot = api.getProjectRoot();
      const androidConfig = projectConfig(projectRoot);
      if (androidConfig) {
        await runAndroid(
          androidConfig,
          { ...pluginConfig, ...(args as Flags) },
          projectRoot,
          api.getRemoteCacheProvider(),
          api.getFingerprintOptions()
        );
      } else {
        throw new RnefError('Android project not found.');
      }
    },
    options: runOptions,
  });
}
