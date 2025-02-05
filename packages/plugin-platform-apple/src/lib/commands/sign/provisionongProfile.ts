import crypto from 'node:crypto';
import * as path from 'node:path';
import { logger, spawn } from '@rnef/tools';
import type { PlistValue } from 'plist';
import plist from 'plist';
import {
  getPlistArrayValue,
  getPlistObjectValue,
  writePlistFile,
} from '../../utils/plist.js';
import { getSignPath } from './path.js';

export async function decodeProvisioningProfilePlist(
  encodeProfilePath: string
): Promise<PlistValue> {
  const securityProcess = await spawn('security', [
    'cms',
    '-D',
    '-i',
    encodeProfilePath,
  ]);

  return plist.parse(securityProcess.stdout);
}

export type GenerateEntitlementsFileOptions = {
  platformName: string;
  provisioningProfilePath: string;
};

export const generateEntitlementsFile = async ({
  platformName,
  provisioningProfilePath,
}: GenerateEntitlementsFileOptions) => {
  const profilePlist = await decodeProvisioningProfilePlist(
    provisioningProfilePath
  );
  const entitlements = getPlistObjectValue(profilePlist, 'Entitlements');

  const entitlementsPath = path.join(
    getSignPath(platformName),
    'entitlements.plist'
  );
  writePlistFile(entitlementsPath, entitlements);

  return entitlementsPath;
};

export async function getIdentityFromProfile(provisioningProfilePath: string) {
  const profilePlist = await decodeProvisioningProfilePlist(
    provisioningProfilePath
  );
  const cert = getPlistArrayValue(profilePlist, 'DeveloperCertificates')[0];
  if (!cert) {
    return null;
  }

  if (!(cert instanceof Buffer)) {
    logger.warn(
      `DeveloperCertificates[0] field is not buffer but ${typeof cert}`
    );
    return null;
  }

  const decodedCert = new crypto.X509Certificate(cert);
  return extractCertificateName(decodedCert.subject);
}

/**
 * Extracts certificate name used from subject field. This names corresponds to
 * the name of the signing identity.
 */
export function extractCertificateName(subject: string) {
  const regex = /CN=(.+)$/m;
  const match = subject.match(regex);
  return match ? match[1] : null;
}
