import { getProjectConfig } from '@react-native-community/cli-config-apple';
import type { PluginApi,PluginOutput } from '@rnef/config';
import {
  BuildFlags,
  createBuild,
  createRun,
  getBuildOptions,
  getRunOptions,
  RunFlags,
} from '@rnef/plugin-platform-apple';
import { RnefError } from '@rnef/tools';

const projectConfig = getProjectConfig({ platformName: 'ios' });
const buildOptions = getBuildOptions({ platformName: 'ios' });
const runOptions = getRunOptions({ platformName: 'ios' });

export const pluginPlatformIOS =
  () =>
  (api: PluginApi): PluginOutput => {
    api.registerCommand({
      name: 'build:ios',
      description: 'Build iOS app.',
      action: async (args) => {
        const projectRoot = api.getProjectRoot();
        const iosConfig = projectConfig(projectRoot, {});

        if (iosConfig) {
          await createBuild('ios', iosConfig, args as BuildFlags);
        } else {
          throw new RnefError('iOS project not found.');
        }
      },
      options: buildOptions,
    });

    api.registerCommand({
      name: 'run:ios',
      description: 'Run iOS app.',
      action: async (args) => {
        const projectRoot = api.getProjectRoot();
        const iosConfig = projectConfig(projectRoot, {});

        if (iosConfig) {
          await createRun('ios', iosConfig, args as RunFlags, projectRoot);
        } else {
          throw new RnefError('iOS project not found.');
        }
      },
      // @ts-expect-error: fix `simulator` is not defined in `RunFlags`
      options: runOptions,
    });

    return {
      name: 'plugin-platform-ios',
      description: 'RNEF plugin for everything iOS.',
    };
  };

export default pluginPlatformIOS;
