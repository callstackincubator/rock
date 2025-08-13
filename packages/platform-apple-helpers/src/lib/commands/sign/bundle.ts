import fs from 'node:fs';
import type { SubprocessError } from '@rock-js/tools';
import { logger, RockError, runHermes, spawn } from '@rock-js/tools';

type BuildJsBundleOptions = {
  bundleOutputPath: string;
  assetsDestPath: string;
  useHermes?: boolean;
  sourcemapOutputPath?: string;
};

/**
 * This function is modelled after [react-native-xcode.sh](https://github.com/facebook/react-native/blob/main/packages/react-native/scripts/react-native-xcode.sh).
 */
export async function buildJsBundle(options: BuildJsBundleOptions) {
  if (fs.existsSync(options.bundleOutputPath)) {
    fs.unlinkSync(options.bundleOutputPath);
    logger.debug('Removed existing JS bundle:', options.bundleOutputPath);
  }

  // Reasonable defaults
  // If user wants to build bundle differently, they should use `rock bundle` command directly
  // and provide the JS bundle path to `--jsbundle` flag
  const rockBundleArgs = [
    'bundle',
    `--entry-file`,
    `index.js`,
    '--platform',
    'ios',
    `--dev`,
    'false',
    '--minify',
    'false',
    '--reset-cache',
    '--bundle-output',
    options.bundleOutputPath,
    '--assets-dest',
    options.assetsDestPath,
    ...(options.sourcemapOutputPath
      ? ['--sourcemap-output', options.sourcemapOutputPath]
      : []),
  ];
  try {
    await spawn('rock', rockBundleArgs, { preferLocal: true });
  } catch (error) {
    throw new RockError('Failed to build JS bundle', {
      cause: (error as SubprocessError).stderr,
    });
  }

  if (!options.useHermes) {
    return;
  }

  await runHermes({
    bundleOutputPath: options.bundleOutputPath,
    sourcemapOutputPath: options.sourcemapOutputPath,
  });
}
