import fs from 'node:fs';
import path from 'node:path';
import { getLocalOS, logger, RnefError, spawn } from '@rnef/tools';
import { getReactNativePackagePath } from './utils.js';

type BuildJsBundleOptions = {
  bundleOutputPath: string;
  assetsDestPath: string;
  sourcemapOutputPath: string;
  useHermes?: boolean;
};

export async function buildJsBundle(options: BuildJsBundleOptions) {
  if (fs.existsSync(options.bundleOutputPath)) {
    fs.unlinkSync(options.bundleOutputPath);
    logger.debug('Removed existing JS bundle:', options.bundleOutputPath);
  }

  if (fs.existsSync(options.sourcemapOutputPath)) {
    fs.unlinkSync(options.sourcemapOutputPath);
    logger.debug('Removed existing sourcemap:', options.sourcemapOutputPath);
  }

  if (fs.existsSync(options.assetsDestPath)) {
    fs.rmSync(options.assetsDestPath, { recursive: true });
    logger.debug('Removed existing assets:', options.assetsDestPath);
  }

  // Captured params:
  // bundle
  //   --platform android
  //   --dev false
  //   --reset-cache
  //   --entry-file <ProjectRoot>/index.js
  //   --bundle-output <ProjectRoot>/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle
  //   --assets-dest <ProjectRoot>/android/app/build/generated/res/createBundleReleaseJsAndAssets
  //   --sourcemap-output <ProjectRoot>/android/app/build/intermediates/sourcemaps/react/release/index.android.bundle.packager.map
  //   --minify false
  //   --verbose

  // Reasonable defaults
  // If user wants to build bundle differently, they should use `rnef bundle` command directly
  // and provide the JS bundle path to `--jsbundle` flag
  const rnefBundleArgs = [
    'rnef',
    'bundle',
    '--platform',
    'android',
    `--dev`,
    'false',
    '--reset-cache',
    `--entry-file`,
    `index.js`,
    '--bundle-output',
    options.bundleOutputPath,
    '--assets-dest',
    options.assetsDestPath,
    '--sourcemap-output',
    options.sourcemapOutputPath,
    '--minify',
    'false',
    '--verbose',
  ];
  await spawn('npx', rnefBundleArgs, {
    stdio: logger.isVerbose() ? 'inherit' : ['ignore', 'pipe', 'pipe'],
  });

  if (!options.useHermes) {
    return;
  }

  const hermescPath = await getHermescPath();
  if (!hermescPath) {
    throw new RnefError(
      'Hermesc binary not found. Use `--no-hermes` flag to disable Hermes.'
    );
  }

  const hermescArgs = [
    '-emit-binary',
    '-max-diagnostic-width=80',
    '-O',
    '-w',
    '-out',
    options.bundleOutputPath, // Needs `-out` path, or otherwise outputs to stdout
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
export async function getHermescPath() {
  const reactNativePath = await getReactNativePackagePath();

  // Local build from source: node_modules/react-native/sdks/hermes/build/bin/hermesc
  const localBuildPath = path.join(
    reactNativePath,
    'sdks/hermes/build/bin/hermesc'
  );
  if (fs.existsSync(localBuildPath)) {
    return localBuildPath;
  }

  // Precompiled binaries: node_modules/react-native/sdks/hermesc/%OS-BIN%/hermesc
  const prebuildPaths = {
    macos: `${reactNativePath}/sdks/hermesc/osx-bin/hermesc`,
    linux: `${reactNativePath}/sdks/hermesc/linux64-bin/hermesc`,
    windows: `${reactNativePath}/sdks/hermesc/win64-bin/hermesc.exe`,
  };

  const os = getLocalOS();
  return prebuildPaths[os];
}
