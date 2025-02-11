import fs from 'node:fs';
import path from 'node:path';
import {
  intro,
  logger,
  outro,
  relativeToCwd,
  RnefError,
  spawn,
  spinner,
} from '@rnef/tools';
import AdmZip from 'adm-zip';
import color from 'picocolors';
import { buildJsBundle } from './bundle.js';
import { getSignOutputPath } from './utils.js';
import { findAndroidBuildTool, getAndroidBuildToolsPath } from '../../paths.js';

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

  intro(`Modifying APK file`);

  const loader = spinner();
  const tempPath = getSignOutputPath();
  const tempApkPath = path.join(tempPath, 'unaligned.apk');
  if (fs.existsSync(tempApkPath)) {
    fs.unlinkSync(tempApkPath);
  }

  // 1. Build JS bundle if needed
  if (options.buildJsBundle) {
    const bundleOutputPath = path.join(tempPath, 'index.android.bundle');
    if (fs.existsSync(bundleOutputPath)) {
      fs.unlinkSync(bundleOutputPath);
    }

    const sourcemapOutputPath = path.join(
      tempPath,
      'index.android.bundle.packager.map'
    );
    if (fs.existsSync(sourcemapOutputPath)) {
      fs.unlinkSync(sourcemapOutputPath);
    }

    const assetsDestPath = path.join(tempPath, 'res');
    if (fs.existsSync(assetsDestPath)) {
      fs.rmSync(assetsDestPath, { recursive: true });
    }

    loader.start('Building JS bundle...');
    await buildJsBundle({
      bundleOutputPath,
      assetsDestPath,
      sourcemapOutputPath,
      useHermes: options.useHermes ?? true,
    });
    loader.stop(
      `Built JS bundle: ${color.cyan(relativeToCwd(bundleOutputPath))}`
    );

    options.jsBundlePath = bundleOutputPath;
  }

  // 2. Copy output ZIP if needed
  loader.start('Initializing output APK...');
  try {
    fs.copyFileSync(options.apkPath, tempApkPath);
  } catch (error) {
    throw new RnefError(
      `Failed to copy APK file to destination path: ${options.outputPath}`,
      {
        cause: error,
      }
    );
  }
  loader.stop(
    `Initialized output APK: ${color.cyan(relativeToCwd(tempApkPath))}`
  );

  const zip = new AdmZip(tempApkPath);

  // 2. Replace JS bundle if provided
  if (options.jsBundlePath) {
    loader.start('Replacing JS bundle...');
    try {
      zip.deleteFile('assets/index.android.bundle');
      zip.addLocalFile(options.jsBundlePath, 'assets', 'index.android.bundle');
    } catch (error) {
      throw new RnefError(
        `Failed to replace JS bundle in destination file: ${options.outputPath}`,
        {
          cause: error,
        }
      );
    }

    loader.stop(
      `Replaced JS bundle with ${color.cyan(
        relativeToCwd(options.jsBundlePath)
      )}`
    );
  }

  loader.start('Creating aligned APK file...');
  const outputApkPath = options.outputPath ?? options.apkPath;
  const zipAlignPath = findAndroidBuildTool('zipalign');
  if (!zipAlignPath) {
    throw new RnefError(
      `"zipalign" not found in Android Build-Tools directory: ${getAndroidBuildToolsPath()}`
    );
  }

  // See: https://developer.android.com/tools/zipalign#usage
  const zipalignArgs = [
    '-P', // aligns uncompressed .so files to the specified page size in KiB.
    '16',
    '-f', // Overwrites existing output file.
    '-v', // Overwrites existing output file.
    '4', // alignment in bytes, e.g. '4' provides 32-bit alignment
    tempApkPath,
    outputApkPath,
  ];

  await spawn(zipAlignPath, zipalignArgs);

  loader.stop(
    `Created aligned APK file: ${color.cyan(
      relativeToCwd(options.outputPath ?? options.apkPath)
    )}`
  );

  loader.start('Signing the APK file...');
  const keystorePath = options.keystore ?? 'android/app/debug.keystore';
  if (!fs.existsSync(keystorePath)) {
    throw new RnefError(
      `Keystore file not found "${keystorePath}". Provide a valid keystore path using the "--keystore" option.`
    );
  }

  const apksignerPath = findAndroidBuildTool('apksigner');
  if (!apksignerPath) {
    throw new RnefError(
      `"apksigner" not found in Android Build-Tools directory: ${getAndroidBuildToolsPath()}`
    );
  }

  // apksigner sign --ks-pass "pass:android" --ks "android/app/debug.keystore" "$OUTPUT2_APK"
  const apksignerArgs = [
    'sign',
    '--ks-pass',
    'pass:android',
    '--ks',
    keystorePath,
    outputApkPath,
  ];
  await spawn(apksignerPath, apksignerArgs);

  loader.stop(`Signed the APK file with keystore: ${color.cyan(keystorePath)}`);

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
