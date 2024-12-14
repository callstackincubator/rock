import type { PluginOutput, PluginApi } from '@callstack/rnef-config';
import {
  createBuild,
  createRun,
  getRunOptions,
  getBuildOptions,
  RunFlags,
  BuildFlags,
} from '@callstack/rnef-plugin-platform-apple';
import { getProjectConfig } from '@react-native-community/cli-config-apple';

const projectConfig = getProjectConfig({ platformName: 'visionos' });
const buildOptions = getBuildOptions({ platformName: 'visionos' });
const runOptions = getRunOptions({ platformName: 'visionos' });

export const pluginPlatformVisionOS =
  () =>
  (api: PluginApi): PluginOutput => {
    api.registerCommand({
      name: 'build:visionos',
      description: 'Build visionOS app.',
      action: async (args) => {
        const projectRoot = api.getProjectRoot();
        const config = projectConfig(projectRoot, {});

        if (config) {
          await createBuild('visionos', config, args as BuildFlags);
        } else {
          throw new Error('visionOS project not found.');
        }
      },
      options: buildOptions,
    });

    api.registerCommand({
      name: 'run:visionos',
      description: 'Run visionOS app.',
      action: async (args) => {
        const projectRoot = api.getProjectRoot();
        const config = projectConfig(projectRoot, {});

        if (config) {
          await createRun('visionos', config, args as RunFlags, projectRoot);
        } else {
          throw new Error('visionOS project not found.');
        }
      },
      // @ts-expect-error: fix `simulator` is not defined in `RunFlags`
      options: runOptions,
    });

    return {
      name: 'plugin-platform-visionos',
      description: 'RNEF plugin for everything visionOS.',
    };
  };

export default pluginPlatformVisionOS;
