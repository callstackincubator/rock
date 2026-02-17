import fs, { existsSync } from 'node:fs';
import path from 'node:path';
import { color, logger } from '@rock-js/tools';
import { runXcodebuild } from './runXcodebuild.js';

/**
 * Xcode emits different `.framework` file based on the destination (simulator arm64/x86_64, iphone arm64 etc.)
 * This takes those `.frameworks` files and merges them to a single `.xcframework` file for easier distribution.
 */
export async function mergeFrameworks({
  frameworkPaths,
  outputPath,
  sourceDir,
}: {
  frameworkPaths: string[];
  outputPath: string;
  sourceDir: string;
}) {
  const xcframeworkName = path.basename(outputPath);

  if (existsSync(outputPath)) {
    logger.debug(`Removing existing merged framework output at ${outputPath}`);
    fs.rmSync(outputPath, { recursive: true, force: true });
  }

  const xcodebuildArgs = [
    '-create-xcframework',
    ...frameworkPaths.flatMap((frameworkPath) => ['-framework', frameworkPath]),
    '-output',
    outputPath,
  ];

  const { errorSummary } = await runXcodebuild(xcodebuildArgs, {
    cwd: sourceDir,
  });

  if (errorSummary) {
    throw new Error('Running xcodebuild failed', {
      cause: errorSummary,
    });
  } else {
    logger.success(`Created ${color.bold(xcframeworkName)}`);
  }
}
