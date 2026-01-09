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
  moduleName: string | undefined,
  androidConfig: AndroidProjectConfig,
) => {
  const config = {
    sourceDir: androidConfig.sourceDir,
    moduleName: moduleName ?? '',
  };
  return config;
};

export const packageAarAction = async ({
  variant,
  moduleName,
  projectRoot,
  pluginConfig,
}: {
  variant: string;
  moduleName: string | undefined;
  projectRoot: string;
  pluginConfig?: AndroidProjectConfig;
}) => {
  intro('Creating an AAR file');

  const androidConfig = projectConfig(projectRoot, pluginConfig);

  if (androidConfig) {
    const config = getAarConfig(moduleName, androidConfig);
    await packageAar(config, variant);
  } else {
    throw new RockError('Android project not found.');
  }
};

export const publishLocalAarAction = async ({
  moduleName,
  projectRoot,
  pluginConfig,
}: {
  moduleName: string | undefined;
  projectRoot: string;
  pluginConfig?: AndroidProjectConfig;
}) => {
  intro('Publishing AAR');

  const androidConfig = projectConfig(projectRoot, pluginConfig);

  if (androidConfig) {
    const config = getAarConfig(moduleName, androidConfig);
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
      action: (args: PackageAarFlags) => {
        return packageAarAction({
          variant: args.variant,
          moduleName: args.moduleName,
          projectRoot: api.getProjectRoot(),
          pluginConfig,
        });
      },
      options: packageAarOptions,
    });

    api.registerCommand({
      name: 'publish-local:aar',
      description: 'Publishes a AAR to local maven repo',
      action: async (args: PackageAarFlags) => {
        return publishLocalAarAction({
          moduleName: args.moduleName,
          projectRoot: api.getProjectRoot(),
          pluginConfig,
        });
      },
      options: publishLocalAarOptions,
    });

    return {
      name: 'plugin-brownfield-android',
      description: 'Rock plugin for brownfield Android.',
    };
  };
