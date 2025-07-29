/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { promises as fs } from 'fs';
import type { RunBuildOptions } from 'metro';
import { runBuild } from 'metro';
import type { ConfigT } from 'metro-config';
import path from 'path';
import loadMetroConfig from '../../utils/loadMetroConfig.js';
import parseKeyValueParamArray from '../../utils/parseKeyValueParamArray.js';
import saveAssets from './saveAssets.js';
// import { styleText } from 'util'; // Not available in all Node versions
function styleText(style: string, text: string): string {
  const styles = {
    red: '\x1b[31m',
    bold: '\x1b[1m',
    reset: '\x1b[0m',
  };
  const colorCode = styles[style as keyof typeof styles] || '';
  return `${colorCode}${text}${styles.reset}`;
}

export type BundleCommandArgs = {
  assetsDest?: string;
  assetCatalogDest?: string;
  entryFile: string;
  resetCache: boolean;
  resetGlobalCache: boolean;
  transformer?: string;
  minify?: boolean;
  config?: string;
  platform: string;
  dev: boolean;
  bundleOutput: string;
  bundleEncoding?: 'utf8' | 'utf16le' | 'ascii';
  maxWorkers?: string;
  sourcemapOutput?: string;
  sourcemapSourcesRoot?: string;
  sourcemapUseAbsolutePath: boolean;
  verbose: boolean;
  unstableTransformProfile: 'hermes-stable' | 'hermes-canary' | 'default';
  indexedRamBundle?: boolean;
  resolverOption?: Array<string>;
  // custom flags
  hermes: boolean;
};

export type Config = {
  root: string;
  reactNativeVersion: string;
  reactNativePath: string;
  platforms: Record<string, object>;
};

async function buildBundle(
  options: {
    platforms: Record<string, object>;
    reactNativeVersion: string;
    reactNativePath: string;
    root: string;
  },
  args: BundleCommandArgs,
  bundleImpl?: RunBuildOptions['output']
): Promise<void> {
  const config = await loadMetroConfig(
    {
      platforms: options.platforms,
      reactNativeVersion: options.reactNativeVersion,
      reactNativePath: options.reactNativePath,
      root: options.root,
    },
    {
      maxWorkers: args.maxWorkers,
      resetCache: args.resetCache,
      config: args.config,
    }
  );

  return buildBundleWithConfig(args, config, bundleImpl);
}

async function buildBundleWithConfig(
  args: BundleCommandArgs,
  config: ConfigT,
  bundleImpl?: RunBuildOptions['output']
): Promise<void> {
  const customResolverOptions = parseKeyValueParamArray(
    args.resolverOption ?? []
  );

  if (config.resolver.platforms.indexOf(args.platform) === -1) {
    console.error(
      `${styleText('red', 'error')}: Invalid platform ${
        args.platform ? `"${styleText('bold', args.platform)}" ` : ''
      }selected.`
    );

    console.info(
      `Available platforms are: ${config.resolver.platforms
        .map((x) => `"${styleText('bold', x)}"`)
        .join(
          ', '
        )}. If you are trying to bundle for an out-of-tree platform, it may not be installed.`
    );

    throw new Error('Bundling failed');
  }

  // This is used by a bazillion of npm modules we don't control so we don't
  // have other choice than defining it as an env variable here.
  process.env['NODE_ENV'] = args.dev ? 'development' : 'production';

  let sourceMapUrl = args.sourcemapOutput;
  if (sourceMapUrl != null && !args.sourcemapUseAbsolutePath) {
    sourceMapUrl = path.basename(sourceMapUrl);
  }

  const runBuildOptions: RunBuildOptions = {
    // @ts-expect-error - missing type, available in Flow types
    bundleOut: args.bundleOutput,
    customResolverOptions,
    dev: args.dev,
    entry: args.entryFile,
    minify: args.minify !== undefined ? args.minify : !args.dev,
    output: bundleImpl,
    platform: args.platform,
    sourceMap: args.sourcemapOutput != null,
    sourceMapOut: args.sourcemapOutput,
    sourceMapUrl,
    unstable_transformProfile: args.unstableTransformProfile,
  };

  // Ensure destination directory exists before running the build
  await fs.mkdir(path.dirname(args.bundleOutput), {
    recursive: true,
    mode: 0o755,
  });

  const result = await runBuild(config, runBuildOptions);

  if (args.assetsDest == null) {
    console.warn('Warning: Assets destination folder is not set, skipping...');
    return;
  }

  // Save the assets of the bundle
  // @ts-expect-error - runBuild returns result with assets
  if (!result || !result.assets) {
    throw new Error("Assets missing from Metro's runBuild result");
  }
  // @ts-expect-error - runBuild returns result with assets
  const outputAssets = result.assets;

  // When we're done saving bundle output and the assets, we're done.
  await saveAssets(
    outputAssets,
    args.platform,
    args.assetsDest,
    args.assetCatalogDest
  );
}

/**
 * UNSTABLE: This function is likely to be relocated and its API changed in
 * the near future. `@react-native/community-cli-plugin` should not be directly
 * depended on by projects or integrators -- this is exported for legacy
 * compatibility.
 *
 * Create a bundle using a pre-loaded Metro config. The config can be
 * re-used for several bundling calls if multiple platforms are being
 * bundled.
 */
export const unstable_buildBundleWithConfig = buildBundleWithConfig;

export default buildBundle;
