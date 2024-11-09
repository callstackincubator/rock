import type { PluginOutput, PluginApi } from '@callstack/rnef-config';
import { buildAndroid, options } from './commands/buildAndroid/index.js';
import { runAndroid, runOptions } from './commands/runAndroid/index.js';
import { loadConfigAsync } from '@react-native-community/cli-config';

export const pluginPlatformAndroid =
  () =>
  (api: PluginApi): PluginOutput => {
    api.registerCommand({
      name: 'build:android',
      description: 'Build android',
      action: async (args) => {
        try {
          const config = await loadConfigAsync({ selectedPlatform: 'android' });
          // @ts-expect-error todo
          await buildAndroid(config, args);
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
        // @ts-expect-error todo
        await runAndroid(config, args);
      },
      // @ts-expect-error todo
      options: runOptions,
    });

    return {
      name: 'plugin-platform-android',
      description: 'RNEF plugin for everything android.',
    };
  };

export default pluginPlatformAndroid;
