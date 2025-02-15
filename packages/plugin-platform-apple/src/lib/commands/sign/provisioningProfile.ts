import crypto from 'node:crypto';
import fs from 'node:fs';
import { logger, relativeToCwd, RnefError, spawn } from '@rnef/tools';
import { readBufferFromPlist, readKeyFromPlist } from '../../utils/plist.js';

/**
 * Decodes provisioning profile to XML plist.
 * @param profilePath - Path to the provisioning profile.
 * @param outputPath - Path to the output plist file.
 */
export async function decodeProvisioningProfileToPlist(
  profilePath: string,
  outputPath: string
) {
  try {
    await spawn('security', ['cms', '-D', '-i', profilePath, '-o', outputPath]);
    logger.debug(
      `Decoded provisioning profile to plist: ${relativeToCwd(outputPath)}`
    );
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
  provisioningPlistPath: string;
  outputPath: string;
};

/**
 * Generates entitlements plist from provisioning profile plist.
 * @param provisioningPlistPath - Path to the provisioning profile plist.
 * @param outputPath - Path to the output entitlements plist file.
 */
export const generateEntitlementsPlist = async ({
  outputPath,
  provisioningPlistPath,
}: GenerateEntitlementsFileOptions) => {
  const entitlements = await readKeyFromPlist(
    provisioningPlistPath,
    'Entitlements',
    {
      xml: true,
    }
  );

  fs.writeFileSync(outputPath, entitlements);
  logger.debug(`Generated entitlements file: ${relativeToCwd(outputPath)}`);
};

/**
 * Extract code sign identity from provisioning profile plist file.
 * @param plistPath - Path to the provisioning profile plist file.
 * @returns Code sign identity name.
 */
export async function getIdentityFromProvisioningPlist(plistPath: string) {
  const cert = await readBufferFromPlist(plistPath, 'DeveloperCertificates:0');
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
