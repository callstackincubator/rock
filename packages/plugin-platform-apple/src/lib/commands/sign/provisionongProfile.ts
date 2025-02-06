import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { logger, relativeToCwd, RnefError, spawn } from '@rnef/tools';
import { readBufferPromPlist, readKeyFromPlist } from '../../utils/plist.js';
import { getSignPath } from './path.js';

export async function decodeProvisioningProfileToPlist(
  profilePath: string,
  outputPath: string
) {
  try {
    await spawn('security', ['cms', '-D', '-i', profilePath, '-o', outputPath]);
  } catch (error) {
    throw new RnefError(
      `Failed to decode provisioning profile: ${profilePath}`,
      {
        cause: error,
      }
    );
  }
}

export type GenerateEntitlementsFileOptions = {
  platformName: string;
  provisioningProfilePath: string;
};

export const generateEntitlementsFile = async ({
  platformName,
  provisioningProfilePath,
}: GenerateEntitlementsFileOptions) => {
  const provisioningProfilePlistPath = path.join(
    getSignPath(platformName),
    'provisioning-profile.plist'
  );
  await decodeProvisioningProfileToPlist(
    provisioningProfilePath,
    provisioningProfilePlistPath
  );
  const entitlements = await readKeyFromPlist(
    provisioningProfilePlistPath,
    'Entitlements',
    {
      xml: true,
    }
  );

  const entitlementsPath = path.join(
    getSignPath(platformName),
    'entitlements.plist'
  );
  fs.writeFileSync(entitlementsPath, entitlements);
  logger.debug(
    `Generated entitlements file: ${relativeToCwd(entitlementsPath)}`
  );

  return entitlementsPath;
};

export async function getIdentityFromProfile(
  provisioningProfilePlistPath: string
) {
  const cert = await readBufferPromPlist(
    provisioningProfilePlistPath,
    'DeveloperCertificates:0'
  );

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
