import type { PluginOutput, PluginApi } from '@callstack/rnef-config';
import {
  startCommand,
  bundleCommand,
  // @ts-expect-error missing typings
} from '@react-native/community-cli-plugin';

type PluginConfig = {
  platforms: {
    [platformName: string]: {
      npmPackageName?: string;
    };
  };
};

export const pluginMetro =
  (pluginConfig: PluginConfig) =>
  (api: PluginApi): PluginOutput => {
    api.registerCommand({
      name: 'dev',
      description: 'Starts Metro dev server.',
      action: async (args) => {
        // @todo replace with api.getProjectRoot()
        const root = '.';
        // @todo replace with api.getReactNativeVersion()
        const reactNativeVersion = '0.76.1';
        startCommand.func(
          undefined,
          { root, reactNativeVersion, platforms: pluginConfig.platforms },
          args
        );
      },
      options: startCommand.options,
    });

    api.registerCommand({
      name: 'bundle',
      description:
        'Build the bundle for the provided JavaScript entry file with Metro.',
      action: async (args) => {
        // @todo replace with api.getProjectRoot()
        const root = '.';
        // @todo replace with api.getReactNativeVersion()
        const reactNativeVersion = '0.76.1';
        bundleCommand.func(
          undefined,
          { root, reactNativeVersion, platforms: pluginConfig.platforms },
          args
        );
      },
      options: bundleCommand.options,
    });

    return {
      name: 'plugin-metro',
      description: 'RNEF plugin for Metro bundler.',
    };
  };

export default pluginMetro;
