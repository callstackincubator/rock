import fs from 'node:fs';
import { logger, RnefError, spinner } from '@rnef/tools';
import { unzipIpaFile } from './zipIpaFile.js';

export type SignIpaFileOptions = {
  ipaPath: string;
  platformName: string;
};

export const signIpaFile = async (options: SignIpaFileOptions) => {
  validateOptions(options);
  const { ipaPath, platformName } = options;

  const loader = spinner();
  loader.start(`Unzipping the IPA file...`);
  const extractedIpaPath = await unzipIpaFile(ipaPath, { platformName });

  loader.stop('Done');

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
