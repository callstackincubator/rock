import fs from 'node:fs';
import path from 'node:path';
import {
  findDirectoriesWithPattern,
  getDotRnefPath,
  logger,
  RnefError,
  spawn,
  spinner,
} from '@rnef/tools';
import { generateEntitlementsFile } from './generateEntitlementsFile.js';
import { packIpa, unpackIpa } from './zip.js';

export type SignIpaFileOptions = {
  ipaPath: string;
  identity: string;
  outputPath?: string;
  platformName: string;
};

export const signIpaFile = async (options: SignIpaFileOptions) => {
  validateOptions(options);
  const { platformName, ipaPath, identity } = options;

  const loader = spinner();
  loader.start(`Unzipping the IPA file...`);
  const extractedIpaPath = path.join(
    getDotRnefPath(),
    platformName,
    'sign/content'
  );
  unpackIpa(ipaPath, extractedIpaPath);
  loader.stop(`Unzipped IPA file ${extractedIpaPath}`);

  const payloadPath = path.join(extractedIpaPath, 'Payload/');
  const appPath = findDirectoriesWithPattern(payloadPath, /\.app$/)[0];
  if (!appPath) {
    throw new RnefError(
      `.app file not found in the extracted IPA file ${payloadPath}`
    );
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
  loader.stop(`Packed the IPA file: ${options.outputPath}`);
};

function validateOptions(options: SignIpaFileOptions) {
  if (!fs.existsSync(options.ipaPath)) {
    throw new RnefError(`IPA file not found "${options.ipaPath}"`);
  }
}
