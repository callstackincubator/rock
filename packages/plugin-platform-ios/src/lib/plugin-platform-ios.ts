import * as path from 'node:path';
import type { PluginOutput, PluginApi } from '@callstack/rnef-config';

const linkModules = () => {
  console.log('link modules');
};
const linkAssets = () => {
  console.log('link assets');
};

const build = (args: unknown) => {
  linkModules();
  linkAssets();
  console.log('build', { args });
};

const run = (args: unknown) => {
  linkModules();
  linkAssets();
  console.log('run', { args });
};

const buildOptions = [
  {
    name: '--port',
    description: 'Port to run on',
    defaultValue: 8080,
  },
  {
    name: '--remote',
    description: 'remote build',
  },
];

const pluginPlatformIOS =
  () =>
  (api: PluginApi): PluginOutput => {
    api.registerCommand({
      name: 'xplat:build',
      description: 'Build xplat',
      action: build,
      options: buildOptions,
    });

    api.registerCommand({
      name: 'xplat:run',
      description: 'Run xplat',
      action: run,
      options: buildOptions,
    });

    return {
      name: 'sample-plugin',
      description: 'sample plugin',
    };
  };

export const getTemplateInfo = () => {
  return {
    name: 'ios',
    templatePath: path.join(__dirname, '../template'),
    editTemplate: () => {
      // init
    },
  };
};

export default pluginPlatformIOS;
