import type { AndroidProjectConfig } from '@react-native-community/cli-types';
import type { PlatformOutput, PluginApi } from '@rnef/config';
import { registerBuildCommand } from './commands/buildAndroid/command.js';
import { registerCreateKeystoreCommand } from './commands/generateKeystore.js';
import { getValidProjectConfig } from './commands/getValidProjectConfig.js';
import { registerRunCommand } from './commands/runAndroid/command.js';
import { registerSignCommand } from './commands/signAndroid/command.js';

type PluginConfig = AndroidProjectConfig;

export const platformAndroid =
  (pluginConfig?: PluginConfig) =>
  (api: PluginApi): PlatformOutput => {
    const androidConfig = getValidProjectConfig(
      api.getProjectRoot(),
      pluginConfig
    );
    registerBuildCommand(api, androidConfig);
    registerRunCommand(api, androidConfig);
    registerCreateKeystoreCommand(api, androidConfig);
    registerSignCommand(api);

    return {
      name: '@rnef/platform-android',
      description: 'RNEF plugin for everything Android.',
      autolinkingConfig: { project: { ...androidConfig } },
    };
  };

export default platformAndroid;
