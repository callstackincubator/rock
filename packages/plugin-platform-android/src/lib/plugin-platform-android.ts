import * as path from 'node:path';
import type { PluginOutput, PluginApi } from '@callstack/rnef-config';
import { buildAndroid, options } from './commands/buildAndroid/index.js';
import { runAndroid, runOptions } from './commands/runAndroid/index.js';
import { loadConfigAsync } from '@react-native-community/cli-config';


const pluginPlatformAndroid =
  () =>
  (api: PluginApi): PluginOutput => {
    api.registerCommand({
      name: 'build:android',
      description: 'Build android',
      action: async (args) => {
        const config = await loadConfigAsync();
        await buildAndroid(config, args);
      },
      options: options,
    });

    api.registerCommand({
      name: 'run:android',
      description: 'Run android',
      action: async (args) => {
        const config = await loadConfigAsync();
        runAndroid(config, args);
      },
      // @ts-expect-error todo
      options: runOptions,
    });

    return {
      name: 'plugin-platform-android',
      description: 'RNEF plugin for everything android.',
    };
  };

export const getTemplateInfo = () => {
  return {
    name: 'android',
    templatePath: path.join(__dirname, '../template'),
    editTemplate: () => {
      // init
    },
  };
};

export default pluginPlatformAndroid;
