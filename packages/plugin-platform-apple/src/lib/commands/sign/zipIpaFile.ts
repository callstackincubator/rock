import { logger, spawn } from '@rnef/tools';
import { existsSync, mkdirSync, rmdirSync } from 'fs';
import { getExtactedIpaPath } from './path.js';

export type UnzipIpaFileOptions = {
  platformName: string;
};

export const unzipIpaFile = async (
  ipaPath: string,
  { platformName }: UnzipIpaFileOptions
) => {
  const extractedPath = getExtactedIpaPath(platformName);
  if (existsSync(extractedPath)) {
    rmdirSync(extractedPath, { recursive: true });
  }

  mkdirSync(extractedPath, { recursive: true });

  const unzipArgs = ['-d', extractedPath, ipaPath];
  const unzip = await spawn('unzip', unzipArgs);
  logger.debug('Running: ', unzip.command);
  if (unzip.stderr) {
    logger.error(unzip.stdout);
  }

  if (!unzip.stdout.includes('Payload')) {
    throw new Error('Payload folder not found in the IPA file');
  }

  return extractedPath;
};
