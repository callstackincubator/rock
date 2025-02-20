import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { getLocalOS } from './env.js';
import { RnefError } from './error.js';
import { getProjectRoot } from './project.js';
import { spawn } from './spawn.js';

function getReactNativePackagePath() {
  const require = createRequire(import.meta.url);
  const root = getProjectRoot();
  const input = require.resolve('react-native', { paths: [root] });
  return path.dirname(input);
}

export async function runHermes({
  bundleOutputPath,
}: {
  bundleOutputPath: string;
}) {
  const hermescPath = getHermescPath();
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
    bundleOutputPath, // Needs `-out` path, or otherwise outputs to stdout
    bundleOutputPath,
  ];
  try {
    await spawn(hermescPath, hermescArgs);
  } catch (error) {
    throw new RnefError(
      'Compiling JS bundle with Hermes failed. Use `--no-hermes` flag to disable Hermes.',
      { cause: error }
    );
  }
}

/**
 * Get `hermesc` binary path.
 * Based on: https://github.com/facebook/react-native/blob/f2c78af56ae492f49b90d0af61ca9bf4d124fca0/packages/gradle-plugin/react-native-gradle-plugin/src/main/kotlin/com/facebook/react/utils/PathUtils.kt#L48-L55
 */
function getHermescPath() {
  const reactNativePath = getReactNativePackagePath();

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
