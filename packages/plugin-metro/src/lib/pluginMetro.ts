import type { PluginApi, PluginOutput } from '@rock-js/config';
import { registerBundleCommand } from './bundle/command.js';
import { registerStartCommand } from './start/command.js';

export const pluginMetro =
  () =>
  (api: PluginApi): PluginOutput => {
    registerStartCommand(api);
    registerBundleCommand(api);

    return {
      name: '@rock-js/plugin-metro',
      description: 'Rock plugin for Metro bundler.',
    };
  };

export default pluginMetro;
