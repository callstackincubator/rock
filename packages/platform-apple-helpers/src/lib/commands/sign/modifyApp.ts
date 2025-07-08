import fs from 'node:fs';
import {
  color,
  intro,
  logger,
  outro,
  relativeToCwd,
  RnefError,
  spinner,
} from '@rnef/tools';
import { buildJsBundle } from './bundle.js';
import { getAppPaths } from './utils.js';

export type ModifyAppOptions = {
  appPath: string;
  outputPath?: string;
  buildJsBundle?: boolean;
  jsBundlePath?: string;
  useHermes?: boolean;
};

export const modifyApp = async (options: ModifyAppOptions) => {
  validateOptions(options);

  intro(`Modifying APP file`);

  const loader = spinner();

  // 1. Copy APP file to output path if provided
  if (options.outputPath) {
    try {
      fs.cpSync(options.appPath, options.outputPath, { recursive: true });
    } catch (error) {
      throw new RnefError(
        `Failed to copy APP file to ${color.cyan(
          relativeToCwd(options.outputPath)
        )}.`,
        { cause: error }
      );
    }
  }

  // 2. Make APP content changes if needed: build or swap JS bundle
  const appPaths = getAppPaths(options.outputPath ?? options.appPath);
  if (options.buildJsBundle) {
    loader.start('Building JS bundle');
    await buildJsBundle({
      bundleOutputPath: appPaths.jsBundle,
      assetsDestPath: appPaths.assetsDest,
      useHermes: options.useHermes ?? true,
    });
    loader.stop(
      `Built JS bundle: ${color.cyan(relativeToCwd(appPaths.jsBundle))}`
    );
  } else if (options.jsBundlePath) {
    loader.start('Replacing JS bundle');
    fs.copyFileSync(options.jsBundlePath, appPaths.jsBundle);
    loader.stop(
      `Replaced JS bundle with ${color.cyan(
        relativeToCwd(options.jsBundlePath)
      )}`
    );
  }

  logger.log(
    `Modified APP file with new JS bundle. Available at: ${color.cyan(
      relativeToCwd(options.outputPath ?? options.appPath)
    )}`
  );

  outro('Success 🎉.');
};

function validateOptions(options: ModifyAppOptions) {
  if (!fs.existsSync(options.appPath)) {
    throw new RnefError(
      `APP file (directory) not found at "${options.appPath}". Please provide a correct path.`
    );
  }

  if (options.buildJsBundle && options.jsBundlePath) {
    throw new RnefError(
      'The "--build-jsbundle" flag is incompatible with "--jsbundle". Pick one.'
    );
  }

  if (options.jsBundlePath && !fs.existsSync(options.jsBundlePath)) {
    throw new RnefError(
      `JS bundle file not found at "${options.jsBundlePath}". Please provide a correct path.`
    );
  }
}
