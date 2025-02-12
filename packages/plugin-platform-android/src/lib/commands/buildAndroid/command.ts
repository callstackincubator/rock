import { projectConfig } from '@react-native-community/cli-config-android';
import type { PluginApi } from '@rnef/config';
import { RnefError } from '@rnef/tools';
import type { BuildFlags } from './buildAndroid.js';
import { buildAndroid, options } from './buildAndroid.js';

export function registerBuildCommand(api: PluginApi) {
  api.registerCommand({
    name: 'build:android',
    description: 'Builds your app for Android platform.',
    action: async (args) => {
      const projectRoot = api.getProjectRoot();
      const androidConfig = projectConfig(projectRoot);
      if (androidConfig) {
        await buildAndroid(androidConfig, args as BuildFlags);
      } else {
        throw new RnefError('Android project not found.');
      }
    },
    options: options,
  });
}
