import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { getLocalOS } from './env.js';
import { RnefError } from './error.js';
import { getProjectRoot } from './project.js';
import type { SubprocessError } from './spawn.js';
import { spawn } from './spawn.js';

function getReactNativePackagePath() {
  const require = createRequire(import.meta.url);
  const root = getProjectRoot();
  const input = require.resolve('react-native', { paths: [root] });
  return path.dirname(input);
}

/**
 * Returns the path to the react-native compose-source-maps.js script.
 */
function getComposeSourceMapsPath(): string {
  const rnPackagePath = getReactNativePackagePath();
  const composeSourceMapsPath = path.join(
    rnPackagePath,
    'scripts',
    'compose-source-maps.js',
  );
  if (!fs.existsSync(composeSourceMapsPath)) {
    throw new RnefError(
      "Could not find react-native's compose-source-maps.js script.",
    );
  }
  return composeSourceMapsPath;
}

/**
 * Extracts debugId from sourcemap file.
 * @see https://github.com/tc39/ecma426/blob/main/proposals/debug-id.md
 * @param sourceMapPath - Sourcemap file path
 * @returns debugId value. Returns null if extraction fails
 */
function extractDebugId(sourceMapPath: string): string | null {
  try {
    const sourceMapContent = fs.readFileSync(sourceMapPath, 'utf-8');
    const sourceMap = JSON.parse(sourceMapContent);
    return sourceMap.debugId;
  } catch {
    return null;
  }
}

/**
 * Inject debugId into sourcemap file at the top level.
 * @see https://github.com/tc39/ecma426/blob/main/proposals/debug-id.md
 * @param sourceMapPath - Sourcemap file path
 * @param debugId - debugId value to inject
 * @throws {RnefError} Throws an error if injection fails
 */
function injectDebugId(sourceMapPath: string, debugId: string) {
  try {
    const sourceMapContent = fs.readFileSync(sourceMapPath, 'utf-8');
    const sourceMap = JSON.parse(sourceMapContent);
    sourceMap.debugId = debugId;
    fs.writeFileSync(sourceMapPath, JSON.stringify(sourceMap));
  } catch {
    throw new RnefError(
      `Failed to inject debugId into sourcemap: ${sourceMapPath}`,
    );
  }
}

export async function runHermes({
  bundleOutputPath,
  sourcemapOutputPath,
}: {
  bundleOutputPath: string;
  sourcemapOutputPath?: string;
}) {
  const hermescPath = getHermescPath();
  if (!hermescPath) {
    throw new RnefError(
      'Hermesc binary not found. Use `--no-hermes` flag to disable Hermes.',
    );
  }

  // Output will be .hbc file
  const hbcOutputPath = `${bundleOutputPath}.hbc`;

  const hermescArgs = [
    '-emit-binary',
    '-max-diagnostic-width=80',
    '-O',
    '-w',
    '-out',
    hbcOutputPath,
    bundleOutputPath,
  ];

  // Add sourcemap flag if enabled
  if (sourcemapOutputPath) {
    hermescArgs.push('-output-source-map');
  }

  try {
    await spawn(hermescPath, hermescArgs);
  } catch (error) {
    throw new RnefError(
      'Compiling JS bundle with Hermes failed. Use `--no-hermes` flag to disable Hermes.',
      { cause: (error as SubprocessError).stderr },
    );
  }

  // Handle sourcemap composition if enabled
  if (sourcemapOutputPath) {
    const hermesSourceMapFile = `${hbcOutputPath}.map`;
    const composeSourceMapsPath = getComposeSourceMapsPath();

    try {
      // Extract debugId from original sourcemap
      const debugId = extractDebugId(sourcemapOutputPath);

      await spawn('node', [
        composeSourceMapsPath,
        sourcemapOutputPath,
        hermesSourceMapFile,
        '-o',
        sourcemapOutputPath,
      ]);

      // Inject debugId back into the composed sourcemap
      if (debugId) {
        injectDebugId(sourcemapOutputPath, debugId);
      }
    } catch (error) {
      throw new RnefError('Failed to run compose-source-maps script', {
        cause: (error as SubprocessError).stderr,
      });
    }
  }

  // Move .hbc file to overwrite the original bundle file
  try {
    if (fs.existsSync(bundleOutputPath)) {
      fs.unlinkSync(bundleOutputPath);
    }
    fs.renameSync(hbcOutputPath, bundleOutputPath);
  } catch (error) {
    throw new RnefError(
      `Failed to move compiled Hermes bytecode to bundle output path: ${error}`,
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
    'sdks/hermes/build/bin/hermesc',
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
