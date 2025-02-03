import { existsSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { getBuildPaths } from '@rnef/plugin-platform-apple';
import { spawn, spinner } from '@rnef/tools';

/**
 * Xcode emits different `.framework` file based on the destination (simulator arm64/x86_64, iphone arm64 etc.)
 * This takes those `.frameworks` files and merges them to a single `.xcframework` file for easier distribution.
 */
export async function mergeFrameworks({
  sourceDir,
  scheme,
  configuration,
  platformName,
  buildFolder,
}: {
  sourceDir: string;
  scheme: string;
  configuration: string;
  platformName: string;
  buildFolder: string;
}) {
  const loader = spinner();

  const { packageDir } = getBuildPaths(platformName);
  const productsPath = path.join(buildFolder, 'Build', 'Products');

  const iosPath = path.join(
    productsPath,
    `${configuration}-iphoneos`,
    `${scheme}.framework`
  );
  const simulatorPath = path.join(
    productsPath,
    `${configuration}-iphonesimulator`,
    `${scheme}.framework`
  );

  const xcframeworkPath = path.join(packageDir, `${scheme}.xcframework`);

  if (existsSync(xcframeworkPath)) {
    loader.start('Removing old framework output');
    rmSync(xcframeworkPath, { recursive: true, force: true });

    loader.stop('Removed old framework output');
  }

  loader.start('Merging the frameworks...');

  const xcodebuildArgs = [
    '-create-xcframework',
    '-framework',
    iosPath,
    '-framework',
    simulatorPath,
    '-output',
    xcframeworkPath,
  ];

  try {
    let xcframeworkFiles: string[] = [];

    await spawn('xcodebuild', xcodebuildArgs, { cwd: sourceDir });
    try {
      xcframeworkFiles = readdirSync(packageDir).filter((file) =>
        file.endsWith('.xcframework')
      );
    } catch {
      xcframeworkFiles = [];
    }

    loader.stop(
      `Exported the xcframework for ${scheme} scheme in ${configuration} configuration to ${
        path.join(packageDir, xcframeworkFiles[0]) ?? packageDir
      }`
    );
  } catch (error) {
    loader.stop(
      'Running xcodebuild failed. Check the error message above for details.',
      1
    );
    throw new Error('Running xcodebuild failed', { cause: error });
  }
}
