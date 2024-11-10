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

export const pluginPlatformIOS =
  () =>
  (api: PluginApi<object>): PluginOutput => {
    api.registerCommand({
      name: 'ios:build',
      description: 'Build ios',
      action: build,
      options: buildOptions,
    });

    api.registerCommand({
      name: 'ios:run',
      description: 'Run ios',
      action: run,
      options: buildOptions,
    });

    return {
      name: 'sample-plugin',
      description: 'sample plugin',
    };
  };

export default pluginPlatformIOS;
