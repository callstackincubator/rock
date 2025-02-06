import fs from 'node:fs';
import { logger, relativeToCwd, RnefError, spawn, spinner } from '@rnef/tools';
import color from 'picocolors';
import { promptSigningIdentity } from '../../utils/signingIdentities.js';
import { buildJsBundle } from './bundle.js';
import {
  decodeProvisioningProfileToPlist,
  generateEntitlementsPlist,
  getIdentityFromProvisioningPlist,
} from './provisioningProfile.js';
import { getAppPaths, getTempPaths, packIpa, unpackIpa } from './utils.js';

export type ModifyIpaOptions = {
  platformName: string;
  ipaPath: string;
  identity?: string;
  outputPath?: string;
  buildJsBundle?: boolean;
  jsBundlePath?: string;
  useHermes?: boolean;
};

export const modifyIpa = async (options: ModifyIpaOptions) => {
  validateOptions(options);

  // 1. Extract IPA contents
  const loader = spinner();
  loader.start(`Unzipping the IPA file...`);
  const tempPaths = getTempPaths(options.platformName);
  const appPath = unpackIpa(options.ipaPath, tempPaths.content);
  loader.stop(`Unzipped IPA contents: ${color.cyan(relativeToCwd(appPath))}`);

  // 2. Make IPA content changes if needed: build or swap JS bundle
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

  // 3. Sign the IPA contents
  await decodeProvisioningProfileToPlist(
    appPaths.provisioningProfile,
    tempPaths.provisioningPlist
  );

  let identity = options.identity;
  if (!identity) {
    const currentIdentity = await getIdentityFromProvisioningPlist(
      tempPaths.provisioningPlist
    );
    if (currentIdentity) {
      logger.debug(
        `Extracted identity from provisioning profile: ${currentIdentity}`
      );
    }

    identity = await promptSigningIdentity(currentIdentity);
  }

  loader.start('Signing the IPA contents...');
  await generateEntitlementsPlist({
    provisioningPlistPath: tempPaths.provisioningPlist,
    outputPath: tempPaths.entitlementsPlist,
  });

  const codeSignArgs = [
    '--force',
    '--sign',
    identity,
    '--entitlements',
    tempPaths.entitlementsPlist,
    appPath,
  ];
  try {
    await spawn('codesign', codeSignArgs, {
      cwd: tempPaths.content,
      stdio: logger.isVerbose() ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    throw new RnefError('Codesign failed', {
      cause: error,
    });
  }

  loader.stop(`Signed the IPA contents with identity: ${color.cyan(identity)}`);

  // 4. Repack the IPA file
  loader.start('Repacking the IPA file...');
  const outputPath = options.outputPath ?? options.ipaPath;
  packIpa(tempPaths.content, outputPath);
  loader.stop(`Repacked the IPA file: ${color.cyan(outputPath)}`);
};

function validateOptions(options: ModifyIpaOptions) {
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
