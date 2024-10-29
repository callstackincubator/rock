import * as path from 'node:path';
import type { PluginOutput, PluginApi } from '@callstack/rnef-config';

const linkModules = () => {
  console.log('link modules');
};
const linkAssets = () => {
  console.log('link assets');
};

const build = (args: unknown) => {
  linkModules(); // -> rnc-cli config --platform android
  linkAssets(); // -> logic react-native-assets, specific to android
  // args.bundler.build()
  // nativeAndroidBuild()
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

const pluginPlatformAndroid =
  () =>
  (api: PluginApi): PluginOutput => {
    api.registerCommand({
      name: 'build:android',
      description: 'Build Android app.',
      action: build,
      options: buildOptions,
    });

    api.registerCommand({
      name: 'run:android',
      description: 'Run Android app.',
      action: run,
      options: buildOptions,
    });

    return {
      name: 'plugin-platform-android',
      description: 'RNEF plugin for everything Android.',
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
