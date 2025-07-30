import type { IOSProjectConfig } from '@react-native-community/cli-types';
import type { PlatformOutput, PluginApi } from '@rnef/config';
import type { BuildFlags, RunFlags } from '@rnef/platform-apple-helpers';
import {
  createBuild,
  createRun,
  getBuildOptions,
  getRunOptions,
  getValidProjectConfig,
} from '@rnef/platform-apple-helpers';
import { intro, outro } from '@rnef/tools';
import { registerSignCommand } from './commands/signIos.js';

const buildOptions = getBuildOptions({ platformName: 'ios' });
const runOptions = getRunOptions({ platformName: 'ios' });

export const platformIOS =
  (pluginConfig?: IOSProjectConfig) =>
  (api: PluginApi): PlatformOutput => {
    api.registerCommand({
      name: 'build:ios',
      description: 'Build iOS app.',
      action: async (args) => {
        intro('Building iOS app');
        const projectRoot = api.getProjectRoot();
        const iosConfig = getValidProjectConfig(
          'ios',
          projectRoot,
          pluginConfig
        );
        await createBuild({
          platformName: 'ios',
          projectConfig: iosConfig,
          args: args as BuildFlags,
          projectRoot,
          reactNativePath: api.getReactNativePath(),
          fingerprintOptions: api.getFingerprintOptions(),
          remoteCacheProvider: await api.getRemoteCacheProvider(),
        });
        outro('Success 🎉.');
      },
      options: buildOptions,
    });

    api.registerCommand({
      name: 'run:ios',
      description: 'Run iOS app.',
      action: async (args) => {
        intro('Running iOS app');
        const projectRoot = api.getProjectRoot();
        const iosConfig = getValidProjectConfig(
          'ios',
          projectRoot,
          pluginConfig
        );
        await createRun({
          platformName: 'ios',
          projectConfig: iosConfig,
          args: args as RunFlags,
          projectRoot,
          remoteCacheProvider: await api.getRemoteCacheProvider(),
          fingerprintOptions: api.getFingerprintOptions(),
          reactNativePath: api.getReactNativePath(),
        });
        outro('Success 🎉.');
      },
      // @ts-expect-error: fix `simulator` is not defined in `RunFlags`
      options: runOptions,
    });

    registerSignCommand(api);

    return {
      name: '@rnef/platform-ios',
      description: 'RNEF plugin for everything iOS.',
      autolinkingConfig: {
        get project() {
          const iosConfig = getValidProjectConfig(
            'ios',
            api.getProjectRoot(),
            pluginConfig
          );
          return { ...iosConfig };
        },
      },
    };
  };

export const platformTVOS =
  (pluginConfig?: IOSProjectConfig) =>
  (api: PluginApi): PlatformOutput => {
    api.registerCommand({
      name: 'build:ios:tv',
      description: 'Build tvOS app.',
      action: async (args) => {
        intro('Building tvOS app');
        const projectRoot = api.getProjectRoot();
        const tvosConfig = getValidProjectConfig(
          'tvos',
          projectRoot,
          pluginConfig
        );
        await createBuild({
          platformName: 'tvos',
          projectConfig: tvosConfig,
          args: args as BuildFlags,
          projectRoot,
          reactNativePath: api.getReactNativePath(),
          fingerprintOptions: api.getFingerprintOptions(),
          remoteCacheProvider: await api.getRemoteCacheProvider(),
        });
        outro('Success 🎉.');
      },
      options: buildOptions,
    });

    api.registerCommand({
      name: 'run:ios:tv',
      description: 'Run tvOS app.',
      action: async (args) => {
        intro('Running tvOS app');
        const projectRoot = api.getProjectRoot();
        const tvosConfig = getValidProjectConfig(
          'tvos',
          projectRoot,
          pluginConfig
        );
        await createRun({
          platformName: 'tvos',
          projectConfig: tvosConfig,
          args: args as RunFlags,
          projectRoot,
          remoteCacheProvider: await api.getRemoteCacheProvider(),
          fingerprintOptions: api.getFingerprintOptions(),
          reactNativePath: api.getReactNativePath(),
        });
        outro('Success 🎉.');
      },
      // @ts-expect-error: fix `simulator` is not defined in `RunFlags`
      options: runOptions,
    });

    return {
      name: '@rnef/platform-tvos',
      description: 'RNEF plugin for everything tvOS.',
      autolinkingConfig: {
        get project() {
          const tvosConfig = getValidProjectConfig(
            'tvos',
            api.getProjectRoot(),
            pluginConfig
          );
          return { ...tvosConfig };
        },
      },
    };
  };

export default platformIOS;
