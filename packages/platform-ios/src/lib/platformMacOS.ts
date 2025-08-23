import type { IOSProjectConfig } from '@react-native-community/cli-types';
import type { PlatformOutput, PluginApi } from '@rock-js/config';
import type { BuildFlags, RunFlags } from '@rock-js/platform-apple-helpers';
import {
  createBuild,
  createRun,
  getBuildOptions,
  getRunOptions,
  getValidProjectConfig,
} from '@rock-js/platform-apple-helpers';
import { intro, outro } from '@rock-js/tools';
// import { registerSignCommand } from './commands/signIos.js';

const buildOptions = getBuildOptions({ platformName: 'ios' });
const runOptions = getRunOptions({ platformName: 'ios' });

export const platformMacOS =
  (pluginConfig?: Partial<IOSProjectConfig>) =>
  (api: PluginApi): PlatformOutput => {
    api.registerCommand({
      name: 'build:macos',
      description: 'Build macOS app.',
      action: async (args) => {
        intro('Building macOS app');
        const projectRoot = api.getProjectRoot();
        const projectConfig = getValidProjectConfig(
          'macos',
          projectRoot,
          pluginConfig,
        );
        await createBuild({
          platformName: 'macos',
          projectConfig,
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
      name: 'run:macos',
      description: 'Run macOS app.',
      action: async (args) => {
        intro('Running macOS app');
        const projectRoot = api.getProjectRoot();
        const projectConfig = getValidProjectConfig(
          'macos',
          projectRoot,
          pluginConfig,
        );
        await createRun({
          platformName: 'macos',
          projectConfig,
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

    // registerSignCommand(api);

    return {
      name: '@rock-js/platform-macos',
      description: 'Rock plugin for everything macOS.',
      autolinkingConfig: {
        get project() {
          const projectConfig = getValidProjectConfig(
            'macos',
            api.getProjectRoot(),
            pluginConfig,
          );
          return { ...projectConfig, npmPackageName: 'react-native-macos' };
        },
      },
    };
  };

export default platformMacOS;
