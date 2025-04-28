import type { PluginApi, PluginOutput } from '@rnef/config';
import { registerBundleCommand } from './bundle/command.js';
import { registerStartCommand } from './start/command.js';

export const pluginMetro =
  () =>
  (api: PluginApi): PluginOutput => {
    registerStartCommand(api);
    registerBundleCommand(api);

    return {
      name: '@rnef/plugin-metro',
      description: 'RNEF plugin for Metro bundler.',
    };
  };

export default pluginMetro;
