import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { findDirectoriesWithPattern, RnefError } from '@rnef/tools';
import AdmZip from 'adm-zip';

export const unpackIpa = (ipaPath: string, destination: string): string => {
  if (existsSync(destination)) {
    rmSync(destination, { recursive: true, force: true });
  }

  mkdirSync(destination, { recursive: true });

  const zip = new AdmZip(ipaPath);
  zip.extractAllTo(destination, true);

  const payloadPath = `${destination}/Payload`;
  if (!existsSync(payloadPath)) {
    throw new Error('Payload folder not found in the extracted IPA file');
  }

  const appPath = findDirectoriesWithPattern(payloadPath, /\.app$/)[0];
  if (!appPath) {
    throw new RnefError(
      `.app package not found in the extracted IPA file ${payloadPath}`
    );
  }

  return appPath;
};

export const packIpa = (contentPath: string, ipaPath: string) => {
  if (existsSync(ipaPath)) {
    rmSync(ipaPath, { recursive: true, force: true });
  }

  const zip = new AdmZip();
  zip.addLocalFolder(contentPath);
  zip.writeZip(ipaPath);

  return ipaPath;
};
