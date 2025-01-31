import { getProjectConfig } from '@react-native-community/cli-config-apple';
import type { PluginApi, PluginOutput } from '@rnef/config';
import {
  createBuild,
  getBuildOptions,
} from '@rnef/plugin-platform-apple';
import {  RnefError } from '@rnef/tools';

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
      },
      options: buildOptions,
    });

    return {
      name: 'plugin-brownfield-ios',
      description: 'RNEF plugin for brownfield iOS.',
    };
  };

export default pluginBrownfieldIos;
