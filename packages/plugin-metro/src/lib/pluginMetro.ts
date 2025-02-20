import {
  bundleCommand,
  startCommand,
  // @ts-expect-error missing typings
} from '@react-native/community-cli-plugin';
import type { PluginApi, PluginOutput } from '@rnef/config';
import { findDevServerPort, RnefError } from '@rnef/tools';
import { runHermesByPlatform } from './runHermesByPlatform.js';

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
  // custom flags
  hermes: boolean;
};

export const pluginMetro =
  (pluginConfig: PluginConfig = {}) =>
  (api: PluginApi): PluginOutput => {
    api.registerCommand({
      name: 'start',
      description: 'Starts Metro dev server.',
      action: async (args: StartCommandArgs) => {
        const root = api.getProjectRoot();
        const reactNativeVersion = api.getReactNativeVersion();
        const reactNativePath = api.getReactNativePath();
        const platforms = api.getPlatforms();

        const { port, startDevServer } = await findDevServerPort(
          args.port ?? 8081,
          root
        );

        if (!startDevServer) {
          return;
        }

        startCommand.func(
          undefined,
          {
            root,
            reactNativeVersion,
            reactNativePath,
            platforms,
            ...pluginConfig,
          },
          {
            ...args,
            port,
          }
        );
      },
      options: startCommand.options,
    });

    api.registerCommand({
      name: 'bundle',
      description:
        'Build the bundle for the provided JavaScript entry file with Metro.',
      action: async (args: BundleCommandArgs) => {
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
        if (args.hermes) {
          runHermesByPlatform({
            platform: args.platform,
            bundleOutput: args.bundleOutput,
            api,
          });
        }
      },
      options: [
        ...bundleCommand.options,
        {
          name: '--config-cmd [string]',
          description:
            '[Internal] A hack for Xcode build script pointing to wrong bundle command that recognizes this flag. Do not use.',
        },
        {
          name: '--hermes',
          description:
            'Passes the output JS bundle to Hermes compiler and outputs a bytecode file.',
        },
      ],
    });

    return {
      name: 'plugin-metro',
      description: 'RNEF plugin for Metro bundler.',
    };
  };

export default pluginMetro;
