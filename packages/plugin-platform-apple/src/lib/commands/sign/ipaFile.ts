import fs from 'node:fs';
import path from 'node:path';
import {
  getProjectRoot,
  logger,
  relativeToCwd,
  RnefError,
  spawn,
  spinner,
} from '@rnef/tools';
import color from 'picocolors';
import { promptSigningIdentity } from '../../utils/signingIdentities.js';
import { getExtactedIpaPath } from './path.js';
import {
  generateEntitlementsFile,
  getIdentityFromProfile,
} from './provisionongProfile.js';
import { packIpa, unpackIpa } from './zip.js';

export type SignIpaFileOptions = {
  platformName: string;
  ipaPath: string;
  identity?: string;
  outputPath?: string;
  buildJsBundle?: boolean;
  jsBundlePath?: string;
  useHermes?: boolean;
};

export const signIpaFile = async (options: SignIpaFileOptions) => {
  validateOptions(options);

  // 1. Extract IPA contents
  const loader = spinner();
  loader.start(`Unzipping the IPA file...`);
  const extractedIpaPath = getExtactedIpaPath(options.platformName);
  const appPath = unpackIpa(options.ipaPath, extractedIpaPath);
  loader.stop(
    `Unzipped IPA contents: ${color.cyan(relativeToCwd(extractedIpaPath))}`
  );

  // 2. Make IPA content changes if needed: build or swap JS bundle
  const ipaJsBundlePath = path.join(appPath, 'main.jsbundle');
  if (options.buildJsBundle) {
    loader.start('Building JS bundle...');
    const assetsDestPath = path.join(appPath, 'assets');
    await buildJsBundle({
      bundleOutputPath: ipaJsBundlePath,
      assetsDestPath,
      useHermes: options.useHermes ?? true,
    });
    loader.stop(
      `Built JS bundle: ${color.cyan(relativeToCwd(ipaJsBundlePath))}`
    );
  } else if (options.jsBundlePath) {
    loader.start('Replacing JS bundle...');
    replaceJsBundle({
      sourceBundlePath: options.jsBundlePath,
      targetBundlePath: ipaJsBundlePath,
    });
    loader.stop(
      `Replaced JS bundle with ${color.cyan(
        relativeToCwd(options.jsBundlePath)
      )}`
    );
  }

  // 3. Sign the IPA contents
  const ipaProfilePath = path.join(appPath, 'embedded.mobileprovision');
  let identity = options.identity;
  if (!identity) {
    const identityFromProfile = await getIdentityFromProfile(ipaProfilePath);
    identity = await promptSigningIdentity(identityFromProfile);
  }

  loader.start('Signing the IPA contents...');
  const entitlementsPath = await generateEntitlementsFile({
    platformName: options.platformName,
    provisioningProfilePath: ipaProfilePath,
  });

  const codeSignArgs = [
    '--force',
    '--sign',
    identity,
    '--entitlements',
    entitlementsPath,
    appPath,
  ];
  await spawn('codesign', codeSignArgs, {
    cwd: extractedIpaPath,
    stdio: logger.isVerbose() ? 'inherit' : ['ignore', 'pipe', 'pipe'],
  });

  loader.stop(`Signed the IPA contents with identity: ${color.cyan(identity)}`);

  // 4. Repack the IPA file
  loader.start('Repacking the IPA file...');
  const outputPath = options.outputPath ?? options.ipaPath;
  packIpa(extractedIpaPath, outputPath);
  loader.stop(`Repacked the IPA file: ${color.cyan(outputPath)}`);
};

function validateOptions(options: SignIpaFileOptions) {
  if (!fs.existsSync(options.ipaPath)) {
    throw new RnefError(`IPA file not found "${options.ipaPath}"`);
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

type ReplaceJsBundleOptions = {
  sourceBundlePath: string;
  targetBundlePath: string;
};

function replaceJsBundle({
  sourceBundlePath,
  targetBundlePath,
}: ReplaceJsBundleOptions) {
  if (fs.existsSync(targetBundlePath)) {
    fs.unlinkSync(targetBundlePath);
    logger.debug('Removed existing JS bundle:', targetBundlePath);
  }

  fs.copyFileSync(sourceBundlePath, targetBundlePath);
}

type BuildJsBundleOptions = {
  bundleOutputPath: string;
  assetsDestPath: string;
  useHermes?: boolean;
};

async function buildJsBundle(options: BuildJsBundleOptions) {
  if (fs.existsSync(options.bundleOutputPath)) {
    fs.unlinkSync(options.bundleOutputPath);
    logger.debug('Removed existing JS bundle:', options.bundleOutputPath);
  }

  // Reasonable defaults
  // If user wants to build bundle differently, they should use `rnef bundle` command directly
  // and provide the JS bundle path to `--jsbundle` flag
  const rnefBundleArgs = [
    'bundle',
    `--entry-file`,
    `index.js`,
    '--platform',
    'ios',
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
  await spawn('rnef', rnefBundleArgs, {
    stdio: logger.isVerbose() ? 'inherit' : ['ignore', 'pipe', 'pipe'],
  });

  if (!options.useHermes) {
    return;
  }

  const hermesPath = path.join(
    getProjectRoot(),
    'ios/Pods/hermes-engine/destroot/bin/hermesc'
  );
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
    await spawn(hermesPath, hermescArgs, {
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
