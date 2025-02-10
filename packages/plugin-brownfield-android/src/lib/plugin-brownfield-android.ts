import { projectConfig } from '@react-native-community/cli-config-android';
import type { PluginApi, PluginOutput } from '@rnef/config';
import type { AarProject } from '@rnef/plugin-platform-android';
import { buildAar, type BuildFlags } from '@rnef/plugin-platform-android';
import { intro, RnefError } from '@rnef/tools';

export const pluginBrownfieldAndroid =
  () =>
  (api: PluginApi): PluginOutput => {
    api.registerCommand({
      name: 'package:android',
      description: 'Emits a AAR file from React Native code.',
      action: async (args: BuildFlags) => {
        intro('Generating AAR');

        const projectRoot = api.getProjectRoot();
        const androidConfig: AarProject = {
          sourceDir: projectConfig(projectRoot)?.sourceDir ?? '',
          moduleName: args.moduleName ?? '',
          packageName: args.packageName ?? '',
        };

        if (androidConfig) {
          await buildAar(androidConfig, args);
        } else {
          throw new RnefError('Android project not found.');
        }
      },
      options: opts,
    });

    return {
      name: 'plugin-brownfield-android',
      description: 'RNEF plugin for everything Android.',
    };
  };

const opts = [
  {
    name: '--build-variant <string>',
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
