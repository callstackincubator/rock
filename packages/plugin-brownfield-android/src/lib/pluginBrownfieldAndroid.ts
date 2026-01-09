import { projectConfig } from '@react-native-community/cli-config-android';
import type { AndroidProjectConfig } from '@react-native-community/cli-types';
import type { PluginApi, PluginOutput } from '@rock-js/config';
import {
  packageAar,
  type PackageAarFlags,
  packageAarOptions,
  publishLocalAar,
  publishLocalAarOptions,
} from '@rock-js/platform-android';
import { intro, RockError } from '@rock-js/tools';

const getAarConfig = (
  args: PackageAarFlags,
  androidConfig: AndroidProjectConfig,
) => {
  const config = {
    sourceDir: androidConfig.sourceDir,
    moduleName: args.moduleName ?? '',
  };
  return config;
};

export const pluginBrownfieldAndroidPackageAction = async (
  args: PackageAarFlags,
  apiSubset: Pick<PluginApi, 'getProjectRoot'>,
  pluginConfig?: AndroidProjectConfig,
) => {
  intro('Creating an AAR file');

  const androidConfig = projectConfig(apiSubset.getProjectRoot(), pluginConfig);

  if (androidConfig) {
    const config = getAarConfig(args, androidConfig);
    await packageAar(config, args);
  } else {
    throw new RockError('Android project not found.');
  }
};

export const pluginBrownfieldAndroidPublishAction = async (
  args: PackageAarFlags,
  apiSubset: Pick<PluginApi, 'getProjectRoot'>,
  pluginConfig?: AndroidProjectConfig,
) => {
  intro('Publishing AAR');

  const androidConfig = projectConfig(apiSubset.getProjectRoot(), pluginConfig);

  if (androidConfig) {
    const config = getAarConfig(args, androidConfig);
    await publishLocalAar(config);
  } else {
    throw new RockError('Android project not found.');
  }
};

export const pluginBrownfieldAndroid =
  (pluginConfig?: AndroidProjectConfig) =>
  (api: PluginApi): PluginOutput => {
    api.registerCommand({
      name: 'package:aar',
      description:
        'Produces an AAR file suitable for including React Native app in native projects.',
      action: (args: PackageAarFlags) =>
        pluginBrownfieldAndroidPackageAction(args, api, pluginConfig),
      options: packageAarOptions,
    });

    api.registerCommand({
      name: 'publish-local:aar',
      description: 'Publishes a AAR to local maven repo',
      action: async (args: PackageAarFlags) =>
        pluginBrownfieldAndroidPublishAction(args, api, pluginConfig),
      options: publishLocalAarOptions,
    });

    return {
      name: 'plugin-brownfield-android',
      description: 'Rock plugin for brownfield Android.',
    };
  };
