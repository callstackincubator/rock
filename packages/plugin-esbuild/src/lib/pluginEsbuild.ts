// @ts-expect-error tbd
import { bundle as bundleCommand } from '@react-native-esbuild/cli/lib/commands/bundle.ts';
// @ts-expect-error tbd
import { start as startCommand } from '@react-native-esbuild/cli/lib/commands/start.ts';
import type { PluginApi, PluginOutput } from '@rnef/config';
import {
  color,
  findDevServerPort,
  intro,
  logger,
  RnefError,
  runHermes,
  spinner,
} from '@rnef/tools';

type PluginConfig = {
  platforms?: {
    [key: string]: object;
  };
};

export const pluginRepack =
  (pluginConfig: PluginConfig = {}) =>
  (api: PluginApi): PluginOutput => {
    api.registerCommand({
      name: 'start',
      description: 'Starts ESBuild dev server.',
      action: async (args: typeof startCommand) => {
        const root = api.getProjectRoot();
        const platforms = api.getPlatforms();
        const { port, startDevServer } = await findDevServerPort(
          // @ts-expect-error tbd
          args.port ? Number(args.port) : 8081,
          root
        );

        if (!startDevServer) {
          return;
        }

        startCommand(
          [],
          { root, platforms, ...pluginConfig },
          // @ts-expect-error tbd
          { ...args, port }
        );
      },
      // @ts-expect-error tbd
      options: startCommand.options,
    });

    api.registerCommand({
      name: 'bundle',
      description: 'Bundles JavaScript with ESBuild.',
      action: async (args: typeof bundleCommand) => {
        // @ts-expect-error tbd
        if (!args.entryFile) {
          throw new RnefError(
            '"rnef bundle" command is missing "--entry-file" argument.'
          );
        }
        intro('Compiling JS bundle with ESBuild');
        const root = api.getProjectRoot();
        const platforms = api.getPlatforms();
        // @ts-expect-error tbd
        await bundleCommand([], { root, platforms, ...pluginConfig }, args);

        // @ts-expect-error tbd
        if (args.hermes) {
          // @ts-expect-error tbd
          if (!args.bundleOutput) {
            throw new RnefError(
              'Missing "--bundle-output" argument to run "bundle --hermes".'
            );
          }

          const loader = spinner();
          loader.start('Running Hermes compiler...');
          // @ts-expect-error tbd
          await runHermes({ bundleOutputPath: args.bundleOutput });
          loader.stop(
            `Hermes bytecode bundle created at: ${color.cyan(
              // @ts-expect-error tbd
              args.bundleOutput
            )}`
          );
        } else {
          logger.info(
            // @ts-expect-error tbd
            `JavaScript bundle created at: ${color.cyan(args.bundleOutput)}`
          );
        }
      },
      options: [
        // @ts-expect-error tbd
        ...bundleCommand.options,
        {
          name: '--hermes',
          description:
            'Passes the output JS bundle to Hermes compiler and outputs a bytecode file.',
        },
      ],
    });

    return {
      name: '@rnef/plugin-esbuild',
      description: 'RNEF plugin for ESBuild toolkit with Rspack.',
    };
  };

export default pluginRepack;
