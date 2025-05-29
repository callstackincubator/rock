import type { AndroidProjectConfig } from '@react-native-community/cli-types';
import type { PluginApi } from '@rnef/config';
import type { FingerprintPlatformConfig } from '@rnef/tools';
import { getValidProjectConfig } from '../getValidProjectConfig.js';
import type { Flags } from './runAndroid.js';
import { runAndroid, runOptions } from './runAndroid.js';

export function registerRunCommand(
  api: PluginApi,
  pluginConfig: AndroidProjectConfig | undefined,
  platformConfig: FingerprintPlatformConfig
) {
  api.registerCommand({
    name: 'run:android',
    description:
      'Builds your app and starts it on a connected Android emulator or a device.',
    action: async (_context, args) => {
      const projectRoot = api.getProjectRoot();
      const androidConfig = getValidProjectConfig(projectRoot, pluginConfig);

      await runAndroid(
        androidConfig,
        args as Flags,
        projectRoot,
        await api.getRemoteCacheProvider(),
        platformConfig,
        api.getFingerprintOptions()
      );
    },
    options: runOptions,
  });
}
