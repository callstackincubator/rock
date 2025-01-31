import { getProjectConfig } from '@react-native-community/cli-config-apple';
import type { PluginApi, PluginOutput } from '@rnef/config';
import { createBuild, getBuildOptions } from '@rnef/plugin-platform-apple';
import { RnefError } from '@rnef/tools';

const projectConfig = getProjectConfig({ platformName: 'ios' });
const buildOptions = getBuildOptions({ platformName: 'ios' });

export const pluginBrownfieldIos =
  () =>
  (api: PluginApi): PluginOutput => {
    api.registerCommand({
      name: 'package:ios',
      description: 'Emit a .xcframework file from React Native code.',
      action: async (args) => {
        // const projectRoot = api.getProjectRoot();
        // const iosConfig = projectConfig(projectRoot, {});
        //
        // if (iosConfig) {
        //   await createBuild('ios', iosConfig, args as BuildFlags);
        // } else {
        //   throw new RnefError('iOS project not found.');
        // }
        // if (args.package) {
        //   try {
        //     await mergeFrameworks({
        //       sourceDir,
        //       scheme,
        //       mode,
        //       platformName,
        //       buildFolder: args.buildFolder!,
        //     });
        //   } catch (error) {
        //     throw new RnefError('Failed to create package', { cause: error });
        //   }
        // }
      },
      options: buildOptions,
    });

    return {
      name: 'plugin-brownfield-ios',
      description: 'RNEF plugin for brownfield iOS.',
    };
  };

export default pluginBrownfieldIos;
