import type { PluginOutput, PluginApi } from '@rnef/config';
import {
  startCommand,
  bundleCommand,
  // @ts-expect-error missing typings
} from '@react-native/community-cli-plugin';
import { RnefError } from '@rnef/tools';

type PluginConfig = {
  reactNativeVersion?: string;
  reactNativePath?: string;
  platforms?: {
    [platformName: string]: object;
  };
};

type StartCommandArgs = {
  assetPlugins?: string[];
  cert?: string;
  customLogReporterPath?: string;
  host?: string;
  https?: boolean;
  maxWorkers?: number;
  key?: string;
  platforms: string[];
  port?: number;
  resetCache?: boolean;
  sourceExts?: string[];
  transformer?: string;
  watchFolders?: string[];
  config?: string;
  projectRoot?: string;
  interactive: boolean;
};

type BundleCommandArgs = {
  assetsDest?: string;
  assetCatalogDest?: string;
  entryFile: string;
  resetCache: boolean;
  resetGlobalCache: boolean;
  transformer?: string;
  minify?: boolean;
  config?: string;
  platform: string;
  dev: boolean;
  bundleOutput: string;
  bundleEncoding?: 'utf8' | 'utf16le' | 'ascii';
  maxWorkers?: number;
  sourcemapOutput?: string;
  sourcemapSourcesRoot?: string;
  sourcemapUseAbsolutePath: boolean;
  verbose: boolean;
  unstableTransformProfile: string;
  indexedRamBundle?: boolean;
  resolverOption?: Array<string>;
};

export const pluginMetro =
  (pluginConfig: PluginConfig = {}) =>
  (api: PluginApi): PluginOutput => {
    api.registerCommand({
      name: 'start',
      description: 'Starts Metro dev server.',
      action: (args: StartCommandArgs) => {
        const root = api.getProjectRoot();
        const reactNativeVersion = api.getReactNativeVersion();
        const reactNativePath = api.getReactNativePath();
        const platforms = api.getPlatforms();
        startCommand.func(
          undefined,
          {
            root,
            reactNativeVersion,
            reactNativePath,
            platforms,
            ...pluginConfig,
          },
          args
        );
      },
      options: startCommand.options,
    });

    api.registerCommand({
      name: 'bundle',
      description:
        'Build the bundle for the provided JavaScript entry file with Metro.',
      action: (args: BundleCommandArgs) => {
        if (!args.platform || !args.bundleOutput || !args.entryFile) {
          throw new RnefError(
            '"rnef bundle" command requires all of these flags to bundle JavaScript with Metro: \n  "--platform", "--bundle-output", "--entry-file"'
          );
        }
        const root = api.getProjectRoot();
        const reactNativeVersion = api.getReactNativeVersion();
        const reactNativePath = api.getReactNativePath();
        const platforms = api.getPlatforms();
        bundleCommand.func(
          undefined,
          {
            root,
            reactNativeVersion,
            reactNativePath,
            platforms,
            ...pluginConfig,
          },
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
