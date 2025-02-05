import fs from 'node:fs';
import path from 'node:path';
import {
  findDirectoriesWithPattern,
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
  jsBundlePath?: string;
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

  if (sourceBundlePath) {
    loader.start('Replacing JS bundle...');
    replaceJsBundle({ appPath, sourceBundlePath });
    loader.stop(`Replaced JS bundle with ${color.cyan(sourceBundlePath)}`);
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
