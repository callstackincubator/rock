import type { AndroidProjectConfig } from '@react-native-community/cli-types';
import type { PlatformOutput, PluginApi } from '@rock-js/config';
import { registerBuildCommand } from './commands/buildAndroid/command.js';
import { registerCreateKeystoreCommand } from './commands/generateKeystore.js';
import { getValidProjectConfig } from './commands/getValidProjectConfig.js';
import { registerRunCommand } from './commands/runAndroid/command.js';
import { registerSignCommand } from './commands/signAndroid/command.js';
import { registerValidateElfAlignmentCommand } from './commands/validateElfAlignment/command.js';

type PluginConfig = AndroidProjectConfig;

export const platformAndroid =
  (pluginConfig?: Partial<PluginConfig>) =>
  (api: PluginApi): PlatformOutput => {
    registerBuildCommand(api, pluginConfig);
    registerRunCommand(api, pluginConfig);
    registerValidateElfAlignmentCommand(api);
    registerCreateKeystoreCommand(api, pluginConfig);
    registerSignCommand(api);

    return {
      name: '@rock-js/platform-android',
      description: 'Rock plugin for everything Android.',
      autolinkingConfig: {
        get project() {
          const androidConfig = getValidProjectConfig(
            api.getProjectRoot(),
            pluginConfig,
          );
          return { ...androidConfig };
        },
      },
    };
  };

export default platformAndroid;
