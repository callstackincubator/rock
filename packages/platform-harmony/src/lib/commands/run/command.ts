import type { PluginApi } from '@rock-js/config';
import {
  getValidProjectConfig,
  type HarmonyProjectConfig,
} from '../getValidProjectConfig.js';
import type { Flags } from './runHarmony.js';
import { runHarmony, runOptions } from './runHarmony.js';

export function registerRunCommand(
  api: PluginApi,
  pluginConfig: Partial<HarmonyProjectConfig> | undefined,
) {
  api.registerCommand({
    name: 'run:harmony',
    description:
      'Builds your app and starts it on a connected HarmonyOS Next device.',
    action: async (args) => {
      const projectRoot = api.getProjectRoot();
      const harmonyConfig = getValidProjectConfig(projectRoot, pluginConfig);
      await runHarmony(
        harmonyConfig,
        args as Flags,
        projectRoot,
        await api.getRemoteCacheProvider(),
        api.getFingerprintOptions(),
      );
    },
    options: runOptions,
  });
}
