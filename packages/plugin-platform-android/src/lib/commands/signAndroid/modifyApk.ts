import fs from 'node:fs';
import {
  intro,
  logger,
  outro,
  relativeToCwd,
  RnefError,
  spawn,
  spinner,
} from '@rnef/tools';
import color from 'picocolors';
import { promptSigningIdentity } from '../../utils/signingIdentities.js';
import { buildJsBundle } from './bundle.js';
import { getAppPaths, getTempPaths, packIpa, unpackIpa } from './utils.js';

export type ModifyApkOptions = {
  apkPath: string;
  keystore?: string;
  keystorePassword?: string;
  outputPath?: string;
  buildJsBundle?: boolean;
  jsBundlePath?: string;
  useHermes?: boolean;
};

export const modifyApk = async (options: ModifyApkOptions) => {
  validateOptions(options);

  intro(`Modifying IPA file`);

  // 1. Extract IPA contents
  const loader = spinner();

  //   // 2. Make IPA content changes if needed: build or swap JS bundle
  const appPaths = getAppPaths(appPath);
  if (options.buildJsBundle) {
    loader.start('Building JS bundle...');
    await buildJsBundle({
      bundleOutputPath: appPaths.jsBundle,
      assetsDestPath: appPaths.assetsDest,
      useHermes: options.useHermes ?? true,
    });
    loader.stop(
      `Built JS bundle: ${color.cyan(relativeToCwd(appPaths.jsBundle))}`
    );
  } else if (options.jsBundlePath) {
    loader.start('Replacing JS bundle...');
    fs.copyFileSync(options.jsBundlePath, appPaths.jsBundle);
    loader.stop(
      `Replaced JS bundle with ${color.cyan(
        relativeToCwd(options.jsBundlePath)
      )}`
    );
  }

  loader.start(`Unzipping the IPA file...`);
  const tempPaths = getTempPaths(options.platformName);
  const appPath = unpackIpa(options.ipaPath, tempPaths.content);
  loader.stop(`Unzipped IPA contents: ${color.cyan(relativeToCwd(appPath))}`);

  //   //   // 2. Make IPA content changes if needed: build or swap JS bundle
  //   const appPaths = getAppPaths(appPath);
  //   if (options.buildJsBundle) {
  //     loader.start('Building JS bundle...');
  //     await buildJsBundle({
  //       bundleOutputPath: appPaths.jsBundle,
  //       assetsDestPath: appPaths.assetsDest,
  //       useHermes: options.useHermes ?? true,
  //     });
  //     loader.stop(
  //       `Built JS bundle: ${color.cyan(relativeToCwd(appPaths.jsBundle))}`
  //     );
  //   } else if (options.jsBundlePath) {
  //     loader.start('Replacing JS bundle...');
  //     fs.copyFileSync(options.jsBundlePath, appPaths.jsBundle);
  //     loader.stop(
  //       `Replaced JS bundle with ${color.cyan(
  //         relativeToCwd(options.jsBundlePath)
  //       )}`
  //     );
  //   }

  //   loader.start('Signing the APK contents...');
  //   const codeSignArgs = [
  //     '--force',
  //     '--sign',
  //     identity,
  //     '--entitlements',
  //     tempPaths.entitlementsPlist,
  //     appPath,
  //   ];
  //   try {
  //     await spawn('codesign', codeSignArgs, {
  //       cwd: tempPaths.content,
  //       stdio: logger.isVerbose() ? 'inherit' : ['ignore', 'pipe', 'pipe'],
  //     });
  //   } catch (error) {
  //     throw new RnefError('Codesign failed', {
  //       cause: error,
  //     });
  //   }

  //   loader.stop(`Signed the IPA contents with identity: ${color.cyan(identity)}`);

  //   // 4. Repack the IPA file
  //   loader.start('Repacking the IPA file...');
  //   const outputPath = options.outputPath ?? options.ipaPath;
  //   packIpa(tempPaths.content, outputPath);
  //   loader.stop(`Repacked the IPA file: ${color.cyan(outputPath)}`);

  outro('Success 🎉.');
};

function validateOptions(options: ModifyApkOptions) {
  if (!fs.existsSync(options.apkPath)) {
    throw new RnefError(`APK file not found "${options.apkPath}"`);
  }

  if (options.buildJsBundle && options.jsBundlePath) {
    throw new RnefError(
      'Cannot build JS bundle (`--build-jsbundle`) and provide source JS bundle (`--jsbundle`) path at the same time.'
    );
  }

  if (options.jsBundlePath && !fs.existsSync(options.jsBundlePath)) {
    throw new RnefError(`JS bundle file not found "${options.jsBundlePath}"`);
  }
}
