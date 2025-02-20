import { projectConfig } from '@react-native-community/cli-config-android';
import type { AndroidProjectConfig } from '@react-native-community/cli-types';
import type { PluginApi, PluginOutput } from '@rnef/config';
import {
  type AarProject,
  buildAar,
  type BuildFlags,
  localPublishAar,
} from '@rnef/platform-android';
import { intro, RnefError } from '@rnef/tools';

const getAarConfig = (
  args: BuildFlags,
  androidConfig: AndroidProjectConfig
) => {
  const config: AarProject = {
    sourceDir: androidConfig.sourceDir,
    moduleName: args.moduleName ?? '',
    packageName: args.packageName ?? '',
  };
  return config;
};
export const pluginBrownfieldAndroid =
  () =>
  (api: PluginApi): PluginOutput => {
    const projectRoot = api.getProjectRoot();

    api.registerCommand({
      name: 'package:aar',
      description:
        'Produces an AAR file suitable for including React Native app in native projects.',
      action: async (args: BuildFlags) => {
        intro('Creating an AAR file');

        const androidConfig = projectConfig(projectRoot);

        if (androidConfig) {
          const config = getAarConfig(args, androidConfig);
          await buildAar(config, args);
        } else {
          throw new RnefError('Android project not found.');
        }
      },
      options: packageAarOptions,
    });

    api.registerCommand({
      name: 'publish-local:aar',
      description: 'Publishes a AAR to local maven repo',
      action: async (args: BuildFlags) => {
        intro('Publishing AAR');

        const androidConfig = projectConfig(projectRoot);

        if (androidConfig) {
          const config = getAarConfig(args, androidConfig);
          await localPublishAar(config, args);
        } else {
          throw new RnefError('Android project not found.');
        }
      },
      options: publishAarOptions,
    });

    return {
      name: 'plugin-brownfield-android',
      description: 'RNEF plugin for brownfield Android.',
    };
  };

const packageAarOptions = [
  {
    name: '--variant <string>',
    description:
      "Specify your app's build variant, which is constructed from build type and product flavor, e.g. 'debug' or 'freeRelease'.",
  },
  {
    name: '--module-name <string>',
    description: 'AAR module name',
  },
];

const publishAarOptions = [
  {
    name: '--module-name <string>',
    description: 'AAR module name',
  },
];
