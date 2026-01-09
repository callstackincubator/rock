import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { SubprocessError } from '@rock-js/tools';
import { logger, relativeToCwd, RockError, spawn } from '@rock-js/tools';
import {
  readBufferFromPlist,
  readKeyFromPlist,
  setKeyInPlist,
} from '../../utils/plist.js';

// See: https://developer.apple.com/documentation/bundleresources/entitlements
export const transferRules = [
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
}: {
  provisioningPlistPath: string;
  outputPath: string;
  appPath?: string;
  useAppEntitlements?: boolean;
}) => {
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
      { xml: true },
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

/**
 * Generates merged entitlements plist from both app and provisioning profile.
 * Based on fastlane's use_app_entitlements functionality.
 */
async function generateMergedEntitlementsPlist({
  provisioningPlistPath,
  appPath,
  outputPath,
}: {
  provisioningPlistPath: string;
  appPath: string;
  outputPath: string;
}) {
  const provisioningEntitlements = await readKeyFromPlist(
    provisioningPlistPath,
    'Entitlements',
    { xml: true },
  );
  const appEntitlements = await extractAppEntitlements(appPath);
  const mergedEntitlements = await mergeEntitlements(
    provisioningEntitlements,
    appEntitlements,
  );
  fs.writeFileSync(outputPath, mergedEntitlements);
  logger.debug(
    `Generated merged entitlements file: ${relativeToCwd(outputPath)}`,
  );
}

/**
 * Extract entitlements from app binary using codesign.
 */
async function extractAppEntitlements(appPath: string): Promise<string> {
  try {
    const { stdout } = await spawn('codesign', [
      '-d',
      '--entitlements',
      '-',
      '--xml',
      appPath,
    ]);
    return stdout.trim();
  } catch (error) {
    logger.debug(
      `Could not extract entitlements from app: ${(error as SubprocessError).stderr}`,
    );
    // Return empty plist if no entitlements found
    return '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">\n<dict>\n</dict>\n</plist>';
  }
}

/**
 * Merge entitlements from app and provisioning profile.
 * Based on fastlane's entitlements merging logic.
 */
export async function mergeEntitlements(
  provisioningEntitlements: string,
  appEntitlements: string,
): Promise<string> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), '.rock-temp-'));
  const profileEntitlementsPath = path.join(
    tempDir,
    'profile_entitlements.plist',
  );
  const appEntitlementsPath = path.join(tempDir, 'app_entitlements.plist');

  try {
    fs.writeFileSync(profileEntitlementsPath, provisioningEntitlements);
    fs.writeFileSync(appEntitlementsPath, appEntitlements);

    for (const key of transferRules) {
      try {
        const appValue = await readKeyFromPlist(appEntitlementsPath, key, {
          xml: true,
        });
        if (appValue) {
          await setKeyInPlist(profileEntitlementsPath, key, appValue);
          logger.debug(`Key "${key}" set in merged entitlements`);
        }
      } catch {
        logger.debug(
          `Key "${key}" does not exist in app entitlements, skipping`,
        );
      }
    }
    return fs.readFileSync(profileEntitlementsPath, 'utf8');
  } catch (error) {
    throw new RockError('Failed to merge entitlements', { cause: error });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}
