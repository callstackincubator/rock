import type { PluginOutput, PluginApi } from '@callstack/rnef-config';
import { buildAndroid, options } from './commands/buildAndroid/buildAndroid.js';
import {
  runAndroid,
  runOptions,
  Flags,
} from './commands/runAndroid/runAndroid.js';
import { projectConfig } from '@react-native-community/cli-config-android';
import { AndroidProjectConfig } from '@react-native-community/cli-types';

type PluginConfig = AndroidProjectConfig;

export const pluginPlatformAndroid =
  (pluginConfig: PluginConfig) =>
  (api: PluginApi<Flags>): PluginOutput => {
    api.registerCommand({
      name: 'build:android',
      description: 'Builds your app for Android platform.',
      action: async (args) => {
        try {
          const projectRoot = api.getProjectRoot();
          const androidConfig = projectConfig(projectRoot);
          if (androidConfig) {
            await buildAndroid(androidConfig, { ...pluginConfig, ...args });
          } else {
            throw new Error('Android project not found. ');
          }
        } catch (error) {
          console.error('Error while building android', error);
        }
      },
      options: options,
    });

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
            { ...pluginConfig, ...args },
            projectRoot
          );
        } else {
          throw new Error('Android project not found. ');
        }
      },
      options: runOptions,
    });

    return {
      name: 'plugin-platform-android',
      description: 'RNEF plugin for everything Android.',
    };
  };

export default pluginPlatformAndroid;
