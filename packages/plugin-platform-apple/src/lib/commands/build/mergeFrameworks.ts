import { readdirSync } from 'node:fs';
import path from 'node:path';
import { spawn, spinner } from '@rnef/tools';
import { getBuildPaths } from '../../utils/buildPaths.js';

/**
 * Xcode emits different `.framework` file based on the destination (simulator arm64/x86_64, iphone arm64 etc.)
 * This takes those `.frameworks` files and merges them to a single `.xcframework` file for easier distribution.
 */
export async function mergeFrameworks({
  sourceDir,
  scheme,
  mode,
  platformName,
  buildFolder,
}: {
  sourceDir: string;
  scheme: string;
  mode: string;
  platformName: string;
  buildFolder: string;
}) {
  const loader = spinner();

  const { packageDir } = getBuildPaths(platformName);
  const productsPath = path.join(buildFolder, 'Build', 'Products');

  const iosPath = path.join(
    productsPath,
    `${mode}-iphoneos`,
    `${scheme}.framework`
  );
  const simulatorPath = path.join(
    productsPath,
    `${mode}-iphonesimulator`,
    `${scheme}.framework`
  );

  loader.start('Merging the frameworks...');

  const xcodebuildArgs = [
    '-create-xcframework',
    '-framework',
    iosPath,
    '-framework',
    simulatorPath,
    '-output',
    path.join(packageDir, `${scheme}.xcframework`),
  ];

  try {
    let xcframeworkFiles: string[] = [];

    const { output } = await spawn('xcodebuild', xcodebuildArgs, {
      cwd: sourceDir,
    });
    try {
      xcframeworkFiles = readdirSync(packageDir).filter((file) =>
        file.endsWith('.xcframework')
      );
    } catch {
      xcframeworkFiles = [];
    }

    loader.stop(
      `Exported the xcframework for ${scheme} scheme in ${mode} mode to ${
        path.join(packageDir, xcframeworkFiles[0]) ?? packageDir
      }`
    );
    return output;
  } catch (error) {
    loader.stop(
      'Running xcodebuild failed. Check the error message above for details.',
      1
    );
    throw new Error('Running xcodebuild failed', { cause: error });
  }
}
