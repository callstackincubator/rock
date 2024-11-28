import type { PluginOutput, PluginApi } from '@callstack/rnef-config';
import {
  createBuild,
  getBuildOptions,
} from '@callstack/rnef-plugin-platform-apple';
import { BuildFlags } from '@callstack/rnef-plugin-platform-apple';
import { getProjectConfig } from '@react-native-community/cli-config-apple';

const projectConfig = getProjectConfig({ platformName: 'ios' });

const buildOptions = getBuildOptions({ platformName: 'ios' });

const run = (args: unknown) => {
  console.log('run', { args });
};

export const pluginPlatformIOS =
  () =>
  (api: PluginApi): PluginOutput => {
    api.registerCommand({
      name: 'build:ios',
      description: 'Build iOS app.',
      action: async (args) => {
        const projectRoot = api.getProjectRoot();
        const iosConfig = projectConfig(projectRoot, {});

        if (iosConfig) {
          await createBuild('ios', iosConfig, args as BuildFlags);
        } else {
          throw new Error('iOS project not found.');
        }
      },
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
