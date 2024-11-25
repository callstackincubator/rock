import type { PluginOutput, PluginApi } from '@callstack/rnef-config';
import {
  createBuild,
  getBuildOptions,
} from '@callstack/rnef-plugin-platform-apple';
import { BuildFlags } from '@callstack/rnef-plugin-platform-apple';

const buildOptions = getBuildOptions({ platformName: 'ios' });

const build = async (args: unknown) => {
  await createBuild('ios', args as BuildFlags);
};

const run = (args: unknown) => {
  console.log('run', { args });
};

const pluginPlatformIOS =
  () =>
  (api: PluginApi): PluginOutput => {
    api.registerCommand({
      name: 'build:ios',
      description: 'Build iOS app.',
      action: build,
      options: buildOptions,
    });

    api.registerCommand({
      name: 'run:ios',
      description: 'Run iOS app.',
      action: run,
      options: buildOptions,
    });

    return {
      name: 'plugin-platform-ios',
      description: 'RNEF plugin for everything iOS.',
    };
  };

export default pluginPlatformIOS;
