import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { SubprocessError } from '@rock-js/tools';
import { logger, relativeToCwd, RockError, spawn } from '@rock-js/tools';
import { readBufferFromPlist, readKeyFromPlist } from '../../utils/plist.js';

/**
 * Decodes provisioning profile to XML plist.
 * @param profilePath - Path to the provisioning profile.
 * @param outputPath - Path to the output plist file.
 */
export async function decodeProvisioningProfileToPlist(
  profilePath: string,
  outputPath: string,
) {
  try {
    await spawn('security', ['cms', '-D', '-i', profilePath, '-o', outputPath]);
    logger.debug(
      `Decoded provisioning profile to plist: ${relativeToCwd(outputPath)}`,
    );
  } catch (error) {
    throw new RockError(
      `Failed to decode provisioning profile: ${profilePath}`,
      { cause: (error as SubprocessError).stderr },
    );
  }
}

export type GenerateEntitlementsFileOptions = {
  provisioningPlistPath: string;
  outputPath: string;
  appPath?: string;
  useAppEntitlements?: boolean;
};

/**
 * Generates entitlements plist from provisioning profile plist.
 * @param provisioningPlistPath - Path to the provisioning profile plist.
 * @param outputPath - Path to the output entitlements plist file.
 * @param appPath - Path to the app bundle (for extracting existing entitlements).
 * @param useAppEntitlements - Whether to merge app entitlements with provisioning profile entitlements.
 */
export const generateEntitlementsPlist = async ({
  outputPath,
  provisioningPlistPath,
  appPath,
  useAppEntitlements,
}: GenerateEntitlementsFileOptions) => {
  if (useAppEntitlements && appPath) {
    await generateMergedEntitlementsPlist({
      provisioningPlistPath,
      appPath,
      outputPath,
    });
  } else {
    const entitlements = await readKeyFromPlist(
      provisioningPlistPath,
      'Entitlements',
      {
        xml: true,
      },
    );

    fs.writeFileSync(outputPath, entitlements);
    logger.debug(`Generated entitlements file: ${relativeToCwd(outputPath)}`);
  }
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

type MergedEntitlementsOptions = {
  provisioningPlistPath: string;
  appPath: string;
  outputPath: string;
};

/**
 * Generates merged entitlements plist from both app and provisioning profile.
 * Based on fastlane's use_app_entitlements functionality.
 */
async function generateMergedEntitlementsPlist({
  provisioningPlistPath,
  appPath,
  outputPath,
}: MergedEntitlementsOptions) {
  // Extract entitlements from provisioning profile
  const provisioningEntitlements = await readKeyFromPlist(
    provisioningPlistPath,
    'Entitlements',
    { xml: true },
  );

  // Extract entitlements from app binary
  const appEntitlements = await extractAppEntitlements(appPath);

  // Merge entitlements
  const mergedEntitlements = await mergeEntitlements(
    provisioningEntitlements,
    appEntitlements,
    provisioningPlistPath,
  );

  fs.writeFileSync(outputPath, mergedEntitlements);
  logger.debug(`Generated merged entitlements file: ${relativeToCwd(outputPath)}`);
}

/**
 * Extract entitlements from app binary using codesign.
 */
async function extractAppEntitlements(appPath: string): Promise<string> {
  try {
    const result = await spawn('codesign', ['-d', '--entitlements', '-', '--xml', appPath]);
    return result.stdout.trim();
  } catch (error) {
    logger.debug(`Could not extract entitlements from app: ${(error as SubprocessError).stderr}`);
    // Return empty plist if no entitlements found
    return '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">\n<dict>\n</dict>\n</plist>';
  }
}

/**
 * Merge entitlements from app and provisioning profile.
 * Based on fastlane's entitlements merging logic.
 */
async function mergeEntitlements(
  provisioningEntitlements: string,
  appEntitlements: string,
  provisioningPlistPath: string,
): Promise<string> {
  // Write temporary files for processing
  const tempDir = fs.mkdtempSync(path.join(process.cwd(), '.rock-temp-'));
  const profileEntitlementsPath = path.join(tempDir, 'profile_entitlements.plist');
  const appEntitlementsPath = path.join(tempDir, 'app_entitlements.plist');
  const mergedEntitlementsPath = path.join(tempDir, 'merged_entitlements.plist');

  try {
    fs.writeFileSync(profileEntitlementsPath, provisioningEntitlements);
    fs.writeFileSync(appEntitlementsPath, appEntitlements);

    // Get team identifier from provisioning profile
    const teamIdentifier = await readKeyFromPlist(provisioningPlistPath, 'TeamIdentifier:0');

    // Define entitlements that should be transferred from app to profile
    const transferRules = [
      'com.apple.developer.icloud-container-identifiers',
      'com.apple.developer.icloud-services',
      'com.apple.developer.ubiquity-kvstore-identifier',
      'com.apple.developer.icloud-container-environment',
      'com.apple.security.application-groups',
      'keychain-access-groups',
      'com.apple.developer.associated-domains',
      'com.apple.developer.healthkit',
      'com.apple.developer.homekit',
      'inter-app-audio',
      'com.apple.developer.networking.networkextension',
      'com.apple.developer.maps',
      'com.apple.external-accessory.wireless-configuration',
      'com.apple.developer.siri',
      'com.apple.developer.nfc.readersession.formats',
    ];

    // Start with profile entitlements as base
    let mergedPlist = provisioningEntitlements;

    // Transfer specific entitlements from app to merged entitlements
    for (const key of transferRules) {
      try {
        const appValue = await readKeyFromPlist(appEntitlementsPath, key, { xml: true });
        if (appValue.trim()) {
          // Replace or add the key in the merged entitlements
          await setKeyInPlist(profileEntitlementsPath, key, appValue);
        }
      } catch {
        // Key doesn't exist in app entitlements, skip
      }
    }

    // Read the final merged entitlements
    mergedPlist = fs.readFileSync(profileEntitlementsPath, 'utf8');

    // Clean up temporary files
    fs.rmSync(tempDir, { recursive: true, force: true });

    return mergedPlist;
  } catch (error) {
    // Clean up on error
    fs.rmSync(tempDir, { recursive: true, force: true });
    throw new RockError('Failed to merge entitlements', { cause: error });
  }
}

/**
 * Set a key in a plist file using PlistBuddy.
 */
async function setKeyInPlist(plistPath: string, key: string, value: string) {
  try {
    // First try to set the key (if it exists)
    await spawn('/usr/libexec/PlistBuddy', ['-c', `Set :${key} ${value}`, plistPath]);
  } catch {
    try {
      // If that fails, try to add the key
      await spawn('/usr/libexec/PlistBuddy', ['-c', `Add :${key} ${value}`, plistPath]);
    } catch {
      // If both fail, the entitlement might be complex - skip for now
      logger.debug(`Could not set entitlement key: ${key}`);
    }
  }
}
