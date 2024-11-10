import type { PluginOutput, PluginApi } from '@callstack/rnef-config';
import { buildAndroid, options } from './commands/buildAndroid/index.js';
import { runAndroid, runOptions, Flags } from './commands/runAndroid/index.js';
import { loadConfigAsync } from '@react-native-community/cli-config';

type PluginConfig = Flags;

export const pluginPlatformAndroid =
  (pluginConfig: PluginConfig) =>
  (api: PluginApi<Flags>): PluginOutput => {
    api.registerCommand({
      name: 'build:android',
      description: 'Build android',
      action: async (args) => {
        try {
          const config = await loadConfigAsync({ selectedPlatform: 'android' });
          await buildAndroid(config, { ...pluginConfig, ...args });
        } catch (error) {
          console.error('Error while building android', error);
        }
      },
      options: options,
    });

    api.registerCommand({
      name: 'run:android',
      description: 'Run android',
      action: async (args) => {
        const config = await loadConfigAsync({ selectedPlatform: 'android' });
        await runAndroid(config, { ...pluginConfig, ...args });
      },
      options: runOptions,
    });

    return {
      name: 'plugin-platform-android',
      description: 'RNEF plugin for everything android.',
    };
  };

export default pluginPlatformAndroid;
