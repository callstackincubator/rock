import { createRequire } from 'node:module';
import type { ConfigT, InputConfigT } from 'metro-config';
import { mergeConfig as metroMergeConfig } from 'metro-config';

export type MetroConfig = ConfigT;
export type InputConfig = InputConfigT;

const require = createRequire(import.meta.url);

/**
 * Options for customizing the Rock Metro configuration.
 */
export type RockMetroConfigOptions = {
  /**
   * Additional platforms to support beyond the React Native defaults (ios, android).
   */
  additionalPlatforms?: string[];

  /**
   * Additional file extensions to resolve.
   */
  additionalSourceExts?: string[];

  /**
   * Additional asset extensions to handle.
   */
  additionalAssetExts?: string[];

  /**
   * Enable package.json exports resolution (experimental).
   * @default false
   */
  unstable_enablePackageExports?: boolean;

  /**
   * Custom condition names for package exports resolution.
   */
  unstable_conditionNames?: string[];

  /**
   * Additional folders to watch (useful for monorepos).
   */
  watchFolders?: string[];

  /**
   * Reset the Metro cache on startup.
   * @default false
   */
  resetCache?: boolean;
};

/**
 * Returns the default Metro configuration for Rock projects.
 *
 * @param projectRoot - The root directory of your project (usually `__dirname`)
 * @param options - Optional configuration overrides
 * @returns A Metro configuration object
 *
 * @example
 * const { getDefaultConfig } = require('@rock-js/plugin-metro/config');
 * module.exports = getDefaultConfig(__dirname);
 *
 * @example
 * const { getDefaultConfig, mergeConfig } = require('@rock-js/plugin-metro/config');
 * module.exports = mergeConfig(getDefaultConfig(__dirname), {
 *   // custom overrides
 * });
 */
export function getDefaultConfig(
  projectRoot: string,
  options: RockMetroConfigOptions = {}
): MetroConfig {
  const {
    additionalPlatforms = [],
    additionalSourceExts = [],
    additionalAssetExts = [],
    unstable_enablePackageExports = false,
    unstable_conditionNames,
    watchFolders,
    resetCache = false,
  } = options;

  const {
    getDefaultConfig: getRNDefaultConfig,
    mergeConfig: rnMergeConfig,
  } = require('@react-native/metro-config');

  const baseConfig: MetroConfig = getRNDefaultConfig(projectRoot);

  const resolverOverrides: Record<string, unknown> = {};

  if (additionalPlatforms.length > 0) {
    resolverOverrides['platforms'] = [
      ...baseConfig.resolver.platforms,
      ...additionalPlatforms,
    ];
  }

  if (additionalSourceExts.length > 0) {
    resolverOverrides['sourceExts'] = [
      ...baseConfig.resolver.sourceExts,
      ...additionalSourceExts,
    ];
  }

  if (additionalAssetExts.length > 0) {
    resolverOverrides['assetExts'] = [
      ...baseConfig.resolver.assetExts,
      ...additionalAssetExts,
    ];
  }

  if (unstable_enablePackageExports) {
    resolverOverrides['unstable_enablePackageExports'] = true;
    if (unstable_conditionNames) {
      resolverOverrides['unstable_conditionNames'] = unstable_conditionNames;
    }
  }

  const rockOverrides: Record<string, unknown> = {};

  if (Object.keys(resolverOverrides).length > 0) {
    rockOverrides['resolver'] = resolverOverrides;
  }

  if (watchFolders && watchFolders.length > 0) {
    rockOverrides['watchFolders'] = watchFolders;
  }

  if (resetCache) {
    rockOverrides['resetCache'] = true;
  }

  if (Object.keys(rockOverrides).length > 0) {
    return rnMergeConfig(baseConfig, rockOverrides);
  }

  return baseConfig;
}

/**
 * Merges two Metro configurations together.
 */
export function mergeConfig(
  baseConfig: MetroConfig,
  overrideConfig: InputConfig
): MetroConfig {
  return metroMergeConfig(baseConfig, overrideConfig);
}
