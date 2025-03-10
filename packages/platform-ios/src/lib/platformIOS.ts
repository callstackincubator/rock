import { getProjectConfig } from '@react-native-community/cli-config-apple';
import type { PluginApi, PluginOutput } from '@rnef/config';
import type { BuildFlags, RunFlags } from '@rnef/platform-apple-helpers';
import {
  createBuild,
  createRun,
  getBuildOptions,
  getRunOptions,
} from '@rnef/platform-apple-helpers';
import { RnefError } from '@rnef/tools';
import { registerSignCommand } from './commands/signIos.js';

const projectConfig = getProjectConfig({ platformName: 'ios' });
const buildOptions = getBuildOptions({ platformName: 'ios' });
const runOptions = getRunOptions({ platformName: 'ios' });

export const platformIOS =
  () =>
  (api: PluginApi): PluginOutput => {
    api.registerCommand({
      name: 'build:ios',
      description: 'Build iOS app.',
      action: async (args) => {
        const projectRoot = api.getProjectRoot();
        const iosConfig = projectConfig(projectRoot, {});

        if (iosConfig) {
          await createBuild('ios', iosConfig, args as BuildFlags, projectRoot);
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
          await createRun(
            'ios',
            iosConfig,
            args as RunFlags,
            projectRoot,
            api.getRemoteCacheProvider(),
            api.getFingerprintOptions()
          );
        } else {
          throw new RnefError('iOS project not found.');
        }
      },
      // @ts-expect-error: fix `simulator` is not defined in `RunFlags`
      options: runOptions,
    });

    registerSignCommand(api);

    return {
      name: '@rnef/platform-ios',
      description: 'RNEF plugin for everything iOS.',
    };
  };

export default platformIOS;
