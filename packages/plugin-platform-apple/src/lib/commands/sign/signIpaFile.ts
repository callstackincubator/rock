import fs from 'node:fs';
import path from 'node:path';
import {
  findDirectoriesWithPattern,
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
  const { platformName, ipaPath, jsBundlePath: sourceBundlePath } = options;

  const loader = spinner();
  loader.start(`Unzipping the IPA file...`);
  const extractedIpaPath = getExtactedIpaPath(platformName);
  unpackIpa(ipaPath, extractedIpaPath);
  loader.stop(
    `Unzipped IPA contents: ${color.cyan(relativeToCwd(extractedIpaPath))}`
  );

  const payloadPath = path.join(extractedIpaPath, 'Payload/');
  const appPath = findDirectoriesWithPattern(payloadPath, /\.app$/)[0];
  if (!appPath) {
    throw new RnefError(
      `.app file not found in the extracted IPA file ${payloadPath}`
    );
  }

  if (options.buildJsBundle && sourceBundlePath) {
    throw new RnefError(
      'Cannot build JS bundle (`--build-jsbundle`) and provide source JS bundle (`--jsbundle`) path at the same time.'
    );
  }

  const ipaJsBundlePath = path.join(appPath, 'main.jsbundle');
  if (options.buildJsBundle) {
    loader.start('Building JS bundle...');
    const assetsDestPath = path.join(appPath, 'assets');
    await buildJsBundle({
      bundleOutputPath: ipaJsBundlePath,
      assetsDestPath,
      useHermes: options.useHermes,
    });
    loader.stop(
      `Built JS bundle: ${color.cyan(relativeToCwd(ipaJsBundlePath))}`
    );
  } else if (sourceBundlePath) {
    loader.start('Replacing JS bundle...');
    replaceJsBundle({ appPath, sourceBundlePath });
    loader.stop(
      `Replaced JS bundle with ${color.cyan(relativeToCwd(sourceBundlePath))}`
    );
  }

  const ipaProfilePath = path.join(appPath, 'embedded.mobileprovision');
  let identity = options.identity;
  if (!identity) {
    const identityFromProfile = await getIdentityFromProfile(ipaProfilePath);
    identity = await promptSigningIdentity(identityFromProfile);
  }

  loader.start('Generating entitlements file...');
  const entitlementsPath = await generateEntitlementsFile({
    platformName,
    provisioningProfilePath: ipaProfilePath,
  });
  loader.stop(
    `Generated entitlements file: ${color.cyan(
      relativeToCwd(entitlementsPath)
    )}`
  );

  loader.start('Signing the IPA contents...');
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

  loader.start('Repacking the IPA file...');
  const outputPath = options.outputPath ?? ipaPath;
  packIpa(extractedIpaPath, outputPath);
  loader.stop(`Repacked the IPA file: ${color.cyan(outputPath)}`);
};

function validateOptions(options: SignIpaFileOptions) {
  if (!fs.existsSync(options.ipaPath)) {
    throw new RnefError(`IPA file not found "${options.ipaPath}"`);
  }
}

type ReplaceJsBundleOptions = {
  sourceBundlePath: string;
  appPath: string;
};

function replaceJsBundle({
  sourceBundlePath,
  appPath,
}: ReplaceJsBundleOptions) {
  if (!fs.existsSync(sourceBundlePath)) {
    throw new RnefError(
      `Source bundle file does not exist: ${sourceBundlePath}`
    );
  }

  const ipaJsBundlePath = path.join(appPath, 'main.jsbundle');
  if (fs.existsSync(ipaJsBundlePath)) {
    logger.debug('Removing existing JS bundle:', ipaJsBundlePath);
    fs.unlinkSync(ipaJsBundlePath);
  }

  logger.debug('Copying JS bundle from:', sourceBundlePath);
  fs.copyFileSync(sourceBundlePath, ipaJsBundlePath);
}

type BuildJsBundleOptions = {
  bundleOutputPath: string;
  assetsDestPath: string;
  useHermes?: boolean;
};

async function buildJsBundle(options: BuildJsBundleOptions) {
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
