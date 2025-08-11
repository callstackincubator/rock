import { existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import {
  findDirectoriesWithPattern,
  getDotRnefPath,
  RnefError,
} from '@rnef/tools';
import AdmZip from 'adm-zip';

/**
 * Temporary paths for sign operation.
 * @param platformName - Platform name.
 */
export function getTempPaths(platformName: string) {
  const root = path.join(getDotRnefPath(), platformName, 'sign');
  return {
    /** Root path for sign operation. */
    root,
    /** Path to extracted IPA contents. */
    content: path.join(root, 'content'),
    /** Path to the temporary provisioning plist. */
    provisioningPlist: path.join(root, 'provisioning.plist'),
    /** Path to the temporary entitlements plist. */
    entitlementsPlist: path.join(root, 'entitlements.plist'),
  };
}

/**
 * Paths inside .app directory in extracted IPA file.
 * @param appPath - Path to the .app directory.
 */
export function getAppPaths(appPath: string) {
  return {
    /** Path to assets directory. */
    assetsDest: path.join(appPath, 'assets'),
    /** Path to the JS bundle. */
    jsBundle: path.join(appPath, 'main.jsbundle'),
    /** Path to embedded provisioning profile. */
    provisioningProfile: path.join(appPath, 'embedded.mobileprovision'),
  };
}

/**
 * Unpack IPA file contents to given path.
 * @param ipaPath - Path to the IPA file.
 * @param destination - Path to the destination folder.
 * @returns Path to .app directory (package) inside the IPA file.
 */
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
      `.app package not found in the extracted IPA file ${payloadPath}`,
    );
  }

  return appPath;
};

/**
 * Pack IPA file from content path.
 * @param contentPath - Path to pack as IPA contents.
 * @param ipaPath - Path to the output IPA file.
 * @returns Path to the output IPA file.
 */
export const packIpa = (contentPath: string, ipaPath: string) => {
  if (existsSync(ipaPath)) {
    rmSync(ipaPath, { recursive: true, force: true });
  }

  const zip = new AdmZip();
  zip.addLocalFolder(contentPath);
  zip.writeZip(ipaPath);

  return ipaPath;
};
