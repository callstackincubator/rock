import type { PluginOutput, PluginApi } from '@callstack/rnef-config';
import commands from '@callstack/repack/commands/rspack';
import { logger } from '@callstack/rnef-tools';

type PluginConfig = {
  platforms?: {
    [key: string]: object;
  };
};

// @ts-expect-error todo type
const startCommand = commands.find(
  // @ts-expect-error todo type
  (command) => command.name === 'start'
);
// @ts-expect-error todo type
const bundleCommand = commands.find(
  // @ts-expect-error todo type
  (command) => command.name === 'bundle'
);

export const pluginRepack =
  (pluginConfig: PluginConfig = {}) =>
  (api: PluginApi): PluginOutput => {
    api.registerCommand({
      name: 'start',
      description: 'Starts Re.Pack dev server.',
      action: (args) => {
        const root = api.getProjectRoot();
        const platforms = api.getPlatforms();
        startCommand.func(
          undefined,
          { root, platforms, ...pluginConfig },
          args
        );
      },
      options: startCommand.options,
    });

    api.registerCommand({
      name: 'bundle',
      description: 'Bundles JavaScript with Re.Pack.',
      action: (args) => {
        // @ts-expect-error todo type
        if (!args.entryFile) {
          logger.error(
            '"rnef bundle" command is missing "--entry-file" argument.'
          );
          process.exit(1);
        }
        const root = api.getProjectRoot();
        const platforms = api.getPlatforms();
        bundleCommand.func(
          undefined,
          { root, platforms, ...pluginConfig },
          args
        );
      },
      options: bundleCommand.options,
    });

    return {
      name: 'plugin-repack',
      description: 'RNEF plugin for Re.Pack toolkit with Rspack.',
    };
  };

export default pluginRepack;
