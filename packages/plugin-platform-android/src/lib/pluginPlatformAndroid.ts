import { projectConfig } from '@react-native-community/cli-config-android';
import type { AndroidProjectConfig } from '@react-native-community/cli-types';
import type { PluginApi, PluginOutput } from '@rnef/config';
import { RnefError } from '@rnef/tools';
import {
  buildAndroid,
  type BuildFlags,
  options,
} from './commands/buildAndroid/buildAndroid.js';
import {
  type Flags,
  runAndroid,
  runOptions,
} from './commands/runAndroid/runAndroid.js';
import { signAndroid, signOptions } from './commands/signAndroid.js';

type PluginConfig = AndroidProjectConfig;

export const pluginPlatformAndroid =
  (pluginConfig: PluginConfig) =>
  (api: PluginApi): PluginOutput => {
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
            projectRoot
          );
        } else {
          throw new RnefError('Android project not found.');
        }
      },
      options: runOptions,
    });

    api.registerCommand({
      name: 'sign:android',
      description:
        'Generates a keystore file for signing Android release builds.',
      action: async (args) => {
        const projectRoot = api.getProjectRoot();
        const androidConfig = projectConfig(projectRoot);
        if (androidConfig) {
          await signAndroid(androidConfig, args);
        } else {
          throw new RnefError('Android project not found.');
        }
      },
      options: signOptions,
    });

    return {
      name: 'plugin-platform-android',
      description: 'RNEF plugin for everything Android.',
    };
  };

export default pluginPlatformAndroid;
