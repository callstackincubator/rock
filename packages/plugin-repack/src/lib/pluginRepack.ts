import type { PluginOutput, PluginApi } from '@rnef/config';
import commands from '@callstack/repack/commands/rspack';
import { logger } from '@rnef/tools';

type PluginConfig = {
  platforms?: {
    [key: string]: object;
  };
};

type StartArgs = Parameters<NonNullable<typeof startCommand>['func']>[2];
type BundleArgs = Parameters<NonNullable<typeof bundleCommand>['func']>[2];

const startCommand = commands.find((command) => command.name === 'start');
const bundleCommand = commands.find((command) => command.name === 'bundle');

export const pluginRepack =
  (pluginConfig: PluginConfig = {}) =>
  (api: PluginApi): PluginOutput => {
    if (!startCommand) {
      logger.error('Re.Pack "start" command not found.');
      process.exit(1);
    }

    if (!bundleCommand) {
      logger.error('Re.Pack "bundle" command not found.');
      process.exit(1);
    }

    api.registerCommand({
      name: 'start',
      description: 'Starts Re.Pack dev server.',
      action: (args: StartArgs) => {
        const root = api.getProjectRoot();
        const platforms = api.getPlatforms();
        // @ts-expect-error TODO fix getPlatforms type
        startCommand.func([], { root, platforms, ...pluginConfig }, args);
      },
      options: startCommand.options,
    });

    api.registerCommand({
      name: 'bundle',
      description: 'Bundles JavaScript with Re.Pack.',
      action: (args: BundleArgs) => {
        if (!args.entryFile) {
          logger.error(
            '"rnef bundle" command is missing "--entry-file" argument.'
          );
          process.exit(1);
        }
        const root = api.getProjectRoot();
        const platforms = api.getPlatforms();
        // @ts-expect-error TODO fix getPlatforms type
        bundleCommand.func([], { root, platforms, ...pluginConfig }, args);
      },
      options: bundleCommand.options,
    });

    return {
      name: 'plugin-repack',
      description: 'RNEF plugin for Re.Pack toolkit with Rspack.',
    };
  };

export default pluginRepack;
