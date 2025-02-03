import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { logger } from '@rnef/tools';
import AdmZip from 'adm-zip';

export const unpackIpa = (ipaPath: string, outputPath: string) => {
  if (existsSync(outputPath)) {
    rmSync(outputPath, { recursive: true, force: true });
  }

  mkdirSync(outputPath, { recursive: true });

  const zip = new AdmZip(ipaPath);
  logger.debug('Extracting IPA file to:', outputPath);
  zip.extractAllTo(outputPath, true);

  const payloadPath = `${outputPath}/Payload`;
  if (!existsSync(payloadPath)) {
    throw new Error('Payload folder not found in the extracted IPA file');
  }
};

export const packIpa = (contentPath: string, ipaPath: string) => {
  if (existsSync(ipaPath)) {
    rmSync(ipaPath, { recursive: true, force: true });
  }

  const zip = new AdmZip();
  logger.debug('Creating new ZIP file at:', ipaPath);
  zip.addLocalFolder(contentPath);
  zip.writeZip(ipaPath);

  return ipaPath;
};
