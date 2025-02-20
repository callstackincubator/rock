import { projectConfig } from '@react-native-community/cli-config-android';
import type { PluginApi, PluginOutput } from '@rnef/config';
import {
  type AarProject,
  buildAar,
  type BuildFlags,
  localPublishAar,
} from '@rnef/platform-android';
import { intro, RnefError } from '@rnef/tools';

export const pluginBrownfieldAndroid =
  () =>
  (api: PluginApi): PluginOutput => {
    const projectRoot = api.getProjectRoot();

    api.registerCommand({
      name: 'package:aar',
      description: 'Produces an AAR file suitable for including React Native app in native projects.',
      action: async (args: BuildFlags) => {
        intro('Creating an AAR file');

        const androidConfig = projectConfig(projectRoot);

        if (androidConfig) {
          const config: AarProject = {
            sourceDir: androidConfig.sourceDir,
            moduleName: args.moduleName ?? '',
            packageName: args.packageName ?? '',
          };
          await buildAar(config, args);
        } else {
          throw new RnefError('Android project not found.');
        }
      },
      options: opts,
    });

    api.registerCommand({
      name: 'publish-local:aar',
      description: 'Publishes a AAR to local maven repo',
      action: async (args) => {
        intro('Publishing AAR');

        const androidConfig: AarProject = {
          sourceDir: projectConfig(projectRoot)?.sourceDir ?? '',
          moduleName: args.moduleName ?? '',
          packageName: args.packageName ?? '',
        };

        if (androidConfig) {
          await localPublishAar(androidConfig, args);
        } else {
          throw new RnefError('Android project not found.');
        }
      },
      options: [opts[1]],
    });

    return {
      name: 'plugin-brownfield-android',
      description: 'RNEF plugin for brownfield Android.',
    };
  };

const opts = [
  {
    name: '--variant <string>',
    description:
      "Specify your app's build variant, which is constructed from build type and product flavor, e.g. 'debug' or 'freeRelease'.",
  },
  {
    name: '--module-name <string>',
    description: 'AAR module name',
  },
  {
    name: '--package-name <string>',
    description: 'AAR package name',
  },
];
