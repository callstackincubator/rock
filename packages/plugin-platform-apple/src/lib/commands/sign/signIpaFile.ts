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
import { unzipIpaFile } from './zipIpaFile.js';

export type SignIpaFileOptions = {
  ipaPath: string;
  identity: string;
  outputPath?: string;
  platformName: string;
};

export const signIpaFile = async (options: SignIpaFileOptions) => {
  validateOptions(options);
  const { ipaPath, platformName } = options;

  const loader = spinner();
  loader.start(`Unzipping the IPA file...`);
  const extractedIpaPath = await unzipIpaFile(ipaPath, { platformName });
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

  loader.stop('Signing the IPA contents...');

  logger.debug('Extracted IPA path: ', extractedIpaPath);

  // const rnefPath = getDotRnefPath();
  // const rnefPath = getDotRnefPath();

  // const appPath = '';
  // const entitlementsPath = '';

  // const codeSignArgs = [
  //   'codesign',
  //   '--force',
  //   '--sign',
  //   args.identity,
  //   `--entitlements`,
  //   entitlementsPath,
  //   appPath,
  // ];

  // const loader = spinner();
  // const message = `Signing the IPA with ${args.identity}`;

  //   loader.start(message);
  //   logger.debug(`Running "xcodebuild ${xcodebuildArgs.join(' ')}.`);
  //   try {
  //     const { output } = await spawn('xcodebuild', xcodebuildArgs, {
  //       cwd: sourceDir,
  //       stdio: logger.isVerbose() ? 'inherit' : ['ignore', 'pipe', 'pipe'],
  //     });
  //     loader.stop(
  //       `${
  //         args.archive ? 'Archived' : 'Built'
  //       } the app with xcodebuild for ${scheme} scheme in ${mode} mode.`
  //     );
  //     return output;
  //   } catch (error) {
  //     logger.error((error as SubprocessError).stderr);
  //     loader.stop(
  //       'Running xcodebuild failed. Check the error message above for details.',
  //       1
  //     );

  //     if (!xcodeProject.isWorkspace) {
  //       throw new RnefError(
  //         `If your project uses CocoaPods, make sure to install pods with "pod install" in ${sourceDir} directory.`,
  //         { cause: error }
  //       );
  //     }

  //     throw new RnefError('Running xcodebuild failed', { cause: error });
  //   }
};

function validateOptions(options: SignIpaFileOptions) {
  if (!fs.existsSync(options.ipaPath)) {
    throw new RnefError(`IPA file not found "${options.ipaPath}"`);
  }
}
