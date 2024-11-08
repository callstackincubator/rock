import * as path from 'node:path';
import type { PluginOutput, PluginApi } from '@callstack/rnef-config';
import { buildAndroid, options } from './commands/buildAndroid/index.js';
import { runAndroid, runOptions } from './commands/runAndroid/index.js';


const pluginPlatformAndroid =
  () =>
  (api: PluginApi): PluginOutput => {
    api.registerCommand({
      name: 'build:android',
      description: 'Build android',
      // @ts-expect-error todo
      action: buildAndroid,
      options: options,
    });

    api.registerCommand({
      name: 'run:android',
      description: 'Run android',
      // @ts-expect-error todo
      action: runAndroid,
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
