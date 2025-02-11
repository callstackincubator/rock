import fs from 'node:fs';
import path from 'node:path';
import {
  getLocalOS,
  getProjectRoot,
  logger,
  RnefError,
  spawn,
} from '@rnef/tools';

type BuildJsBundleOptions = {
  bundleOutputPath: string;
  assetsDestPath: string;
  useHermes?: boolean;
};

export async function buildJsBundle(options: BuildJsBundleOptions) {
  if (fs.existsSync(options.bundleOutputPath)) {
    fs.unlinkSync(options.bundleOutputPath);
    logger.debug('Removed existing JS bundle:', options.bundleOutputPath);
  }

  // Reasonable defaults
  // If user wants to build bundle differently, they should use `rnef bundle` command directly
  // and provide the JS bundle path to `--jsbundle` flag
  const rnefBundleArgs = [
    'rnef',
    'bundle',
    `--entry-file`,
    `index.js`,
    '--platform',
    'android',
    `--dev`,
    'false',
    '--minify',
    'false',
    '--reset-cache',
    '--bundle-output',
    options.bundleOutputPath,
    '--assets-dest',
    options.assetsDestPath,
  ];
  await spawn('npx', rnefBundleArgs, {
    stdio: logger.isVerbose() ? 'inherit' : ['ignore', 'pipe', 'pipe'],
  });

  if (!options.useHermes) {
    return;
  }

  const hermescPath = getHermescPath();
  const hermescArgs = [
    '-emit-binary',
    '-max-diagnostic-width=80',
    '-O',
    '-w',
    '-out',
    options.bundleOutputPath,
    options.bundleOutputPath,
  ];

  try {
    await spawn(hermescPath, hermescArgs, {
      stdio: logger.isVerbose() ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    throw new RnefError(
      'Compiling JS bundle with Hermes failed. Use `--no-hermes` flag to disable Hermes.',
      {
        cause: error,
      }
    );
  }
}

/**
 * Get `hermesc` binary path.
 * Based on: https://github.com/facebook/react-native/blob/f2c78af56ae492f49b90d0af61ca9bf4d124fca0/packages/gradle-plugin/react-native-gradle-plugin/src/main/kotlin/com/facebook/react/utils/PathUtils.kt#L48-L55
 */
export function getHermescPath() {
  const basePath = path.join(
    getProjectRoot(),
    'node_modules/react-native/sdks/'
  );

  // Local build from source: node_modules/react-native/sdks/hermes/build/bin/hermesc
  const localBuildPath = path.join(basePath, 'hermes/build/bin/hermesc');
  if (fs.existsSync(localBuildPath)) {
    return localBuildPath;
  }

  // Precompiled binaries: node_modules/react-native/sdks/hermesc/%OS-BIN%/hermesc
  const prebuildPaths = {
    macos: `${basePath}/hermesc/macos/hermesc`,
    linux: `${basePath}/hermesc/linux/hermesc`,
    windows: `${basePath}/hermesc/win32/hermesc.exe`,
  };

  const os = getLocalOS();
  return prebuildPaths[os];
}
