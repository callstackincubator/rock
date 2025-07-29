import fs from 'node:fs';
import path from 'node:path';
import type { PluginApi } from '@rnef/config';
import {
  colorLink,
  intro,
  logger,
  outro,
  RnefError,
  runHermes,
  spinner,
} from '@rnef/tools';
import buildBundle, { type BundleCommandArgs } from './buildBundle.js';

export async function registerBundleCommand(api: PluginApi) {
  api.registerCommand({
    name: 'bundle',
    description:
      'Build the bundle for the provided JavaScript entry file with Metro.',
    action: async (args: BundleCommandArgs) => {
      if (!args.platform || !args.bundleOutput || !args.entryFile) {
        throw new RnefError(
          '"rnef bundle" command requires all of these flags to bundle JavaScript with Metro: \n  "--platform", "--bundle-output", "--entry-file"'
        );
      }
      intro('Compiling JS bundle with Metro');
      const root = api.getProjectRoot();
      const reactNativeVersion = api.getReactNativeVersion();
      const reactNativePath = api.getReactNativePath();
      const platforms = api.getPlatforms();

      // create the bundle output directory if it doesn't exist
      const bundleOutputDir = path.dirname(args.bundleOutput);
      fs.mkdirSync(bundleOutputDir, { recursive: true });

      await buildBundle(
        { root, reactNativeVersion, reactNativePath, platforms },
        args
      );

      if (args.hermes) {
        const loader = spinner();
        loader.start('Running Hermes compiler...');
        await runHermes({
          bundleOutputPath: args.bundleOutput,
          sourcemapOutputPath: args.sourcemapOutput,
        });
        loader.stop(
          `Hermes bytecode bundle created at: ${colorLink(args.bundleOutput)}`
        );
      } else {
        logger.info(
          `JavaScript bundle created at: ${colorLink(args.bundleOutput)}`
        );
      }
      outro('Success 🎉.');
    },
    options: [
      {
        name: '--entry-file <path>',
        description:
          'Path to the root JS file, either absolute or relative to JS root',
      },
      {
        name: '--platform <string>',
        description: 'Either "ios" or "android"',
        default: 'ios',
      },
      {
        name: '--transformer <string>',
        description: 'Specify a custom transformer to be used',
      },
      {
        name: '--dev [boolean]',
        description:
          'If false, warnings are disabled and the bundle is minified',
        parse: (val: string): boolean => val !== 'false',
        default: true,
      },
      {
        name: '--minify [boolean]',
        description:
          'Allows overriding whether bundle is minified. This defaults to ' +
          'false if dev is true, and true if dev is false. Disabling minification ' +
          'can be useful for speeding up production builds for testing purposes.',
        parse: (val: string): boolean => val !== 'false',
      },
      {
        name: '--bundle-output <string>',
        description:
          'File name where to store the resulting bundle, ex. /tmp/groups.bundle',
      },
      {
        name: '--bundle-encoding <string>',
        description:
          'Encoding the bundle should be written in (https://nodejs.org/api/buffer.html#buffer_buffer).',
        default: 'utf8',
      },
      {
        name: '--max-workers <number>',
        description:
          'Specifies the maximum number of workers the worker-pool ' +
          'will spawn for transforming files. This defaults to the number of the ' +
          'cores available on your machine.',
      },
      {
        name: '--sourcemap-output <string>',
        description:
          'File name where to store the sourcemap file for resulting bundle, ex. /tmp/groups.map',
      },
      {
        name: '--sourcemap-sources-root <string>',
        description:
          "Path to make sourcemap's sources entries relative to, ex. /root/dir",
      },
      {
        name: '--sourcemap-use-absolute-path',
        description: 'Report SourceMapURL using its full path',
        default: false,
      },
      {
        name: '--assets-dest <string>',
        description:
          'Directory name where to store assets referenced in the bundle',
      },
      {
        name: '--unstable-transform-profile <string>',
        description:
          'Experimental, transform JS for a specific JS engine. Currently supported: hermes, hermes-canary, default',
        default: 'default',
      },
      {
        name: '--asset-catalog-dest [string]',
        description: 'Path where to create an iOS Asset Catalog for images',
      },
      {
        name: '--reset-cache',
        description: 'Removes cached files',
        default: false,
      },
      {
        name: '--read-global-cache',
        description:
          'Try to fetch transformed JS code from the global cache, if configured.',
        default: false,
      },
      {
        name: '--config <string>',
        description: 'Path to the CLI configuration file',
        parse: (val: string): string => path.resolve(val),
      },
      {
        name: '--resolver-option <string...>',
        description:
          'Custom resolver options of the form key=value. URL-encoded. May be specified multiple times.',
        // @ts-expect-error - TODO: fix this
        parse: (val: string, previous: Array<string> = []): Array<string> =>
          previous.concat([val]),
      },
      {
        name: '--config-cmd [string]',
        description:
          '[Internal] A hack for Xcode build script pointing to wrong bundle command that recognizes this flag. Do not use.',
      },
      {
        name: '--hermes',
        description:
          'Passes the output JS bundle to Hermes compiler and outputs a bytecode file.',
      },
    ],
  });
}
