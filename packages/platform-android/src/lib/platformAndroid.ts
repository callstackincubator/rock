import type { AndroidProjectConfig } from '@react-native-community/cli-types';
import type { PluginApi, PluginOutput } from '@rnef/config';
import { registerBuildCommand } from './commands/buildAndroid/command.js';
import { registerCreateKeystoreCommand } from './commands/generateKeystore.js';
import { registerRunCommand } from './commands/runAndroid/command.js';
import { registerSignCommand } from './commands/signAndroid/command.js';

type PluginConfig = AndroidProjectConfig;

export const platformAndroid =
  (pluginConfig: PluginConfig) =>
  (api: PluginApi): PluginOutput => {
    registerBuildCommand(api);
    registerRunCommand(api, pluginConfig);
    registerCreateKeystoreCommand(api);
    registerSignCommand(api);

    return {
      name: '@rnef/platform-android',
      description: 'RNEF plugin for everything Android.',
    };
  };

export default platformAndroid;
