import fs from 'node:fs';
import path from 'node:path';
import {
  findDirectoriesWithPattern,
  logger,
  RnefError,
  spawn,
  spinner,
} from '@rnef/tools';
import { generateEntitlementsFile } from './generateEntitlementsFile.js';
import { getExtactedIpaPath } from './path.js';
import { packIpa, unpackIpa } from './zip.js';

export type SignIpaFileOptions = {
  platformName: string;
  ipaPath: string;
  identity: string;
  outputPath?: string;
  jsBundlePath?: string;
};

export const signIpaFile = async (options: SignIpaFileOptions) => {
  validateOptions(options);
  const {
    platformName,
    ipaPath,
    identity,
    jsBundlePath: sourceBundlePath,
  } = options;

  const loader = spinner();
  loader.start(`Unzipping the IPA file...`);
  const extractedIpaPath = getExtactedIpaPath(platformName);
  unpackIpa(ipaPath, extractedIpaPath);
  loader.stop(`Unzipped IPA file ${extractedIpaPath}`);

  const payloadPath = path.join(extractedIpaPath, 'Payload/');
  const appPath = findDirectoriesWithPattern(payloadPath, /\.app$/)[0];
  if (!appPath) {
    throw new RnefError(
      `.app file not found in the extracted IPA file ${payloadPath}`
    );
  }

  if (sourceBundlePath) {
    replaceJsBundle({ appPath, sourceBundlePath });
  }

  loader.start('Generating entitlements file...');
  const ipaProfilePath = path.join(appPath, 'embedded.mobileprovision');
  const entitlementsPath = await generateEntitlementsFile({
    platformName,
    provisioningProfilePath: ipaProfilePath,
  });
  loader.stop(`Generated entitlements file ${entitlementsPath}`);

  loader.start('Signing the IPA contents...');
  const codeSignArgs = [
    '--force',
    '--sign',
    options.identity,
    '--entitlements',
    entitlementsPath,
    appPath,
  ];
  const codeSignProcess = await spawn('codesign', codeSignArgs, {
    cwd: extractedIpaPath,
    stdio: logger.isVerbose() ? 'inherit' : ['ignore', 'pipe', 'pipe'],
  });
  logger.debug('Running codesign command: ', codeSignProcess.command);
  logger.debug('Codesign stdout: ', codeSignProcess.stdout);
  logger.debug('Codesign stderr: ', codeSignProcess.stderr);

  loader.stop(`Signed the IPA contents with identity: ${identity}`);

  loader.start('Packing the IPA file...');
  const outputPath = options.outputPath ?? ipaPath;
  packIpa(extractedIpaPath, outputPath);
  loader.stop(`Packed the IPA file: ${outputPath}`);
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

  logger.log('Replaced JS bundle with:', sourceBundlePath);
}
