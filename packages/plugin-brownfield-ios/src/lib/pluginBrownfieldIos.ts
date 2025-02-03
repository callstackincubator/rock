import { getProjectConfig } from '@react-native-community/cli-config-apple';
import type { PluginApi, PluginOutput } from '@rnef/config';
import type { BuildFlags } from '@rnef/plugin-platform-apple';
import { createBuild, getBuildOptions, getBuildPaths } from '@rnef/plugin-platform-apple';
import { intro, outro, RnefError } from '@rnef/tools';
import { mergeFrameworks } from './mergeFrameworks.js';

const projectConfig = getProjectConfig({ platformName: 'ios' });
const buildOptions = getBuildOptions({ platformName: 'ios' });

export const pluginBrownfieldIos =
  () =>
  (api: PluginApi): PluginOutput => {
    api.registerCommand({
      name: 'package:ios',
      description: 'Emit a .xcframework file from React Native code.',
      action: async (args: BuildFlags) => {
        intro('Packaging iOS project');

        const projectRoot = api.getProjectRoot();
        const iosConfig = projectConfig(projectRoot, {});
        const { derivedDataDir } = getBuildPaths('ios');

        const destinations = args.destinations ?? [
          'generic/platform=iphoneos',
          'generic/platform=iphonesimulator',
        ];

        const buildFolder = args.buildFolder ?? derivedDataDir;
        const configuration = args.configuration ?? 'Debug';

        if (iosConfig) {
          await createBuild('ios', iosConfig, {
            ...args,
            destinations,
            buildFolder,
          });
        } else {
          throw new RnefError('iOS project not found.');
        }

        if (!args.scheme) {
          throw new RnefError(
            'Scheme is required. Please provide "--scheme" flag.'
          );
        }

        try {
          await mergeFrameworks({
            scheme: args.scheme,
            configuration,
            sourceDir: iosConfig.sourceDir,
            platformName: 'ios',
            buildFolder,
          });
        } catch (error) {
          throw new RnefError('Failed to create package', { cause: error });
        }

        outro('Success 🎉.');
      },
      options: buildOptions,
    });

    return {
      name: 'plugin-brownfield-ios',
      description: 'RNEF plugin for brownfield iOS.',
    };
  };

export default pluginBrownfieldIos;
