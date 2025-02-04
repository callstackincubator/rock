import * as path from 'node:path';
import { spawn } from '@rnef/tools';
import plist from 'plist';
import { getPlistObjectValue, writePlistFile } from '../../utils/plist.js';
import { getSignPath } from './path.js';

export type GenerateEntitlementsFileOptions = {
  platformName: string;
  provisioningProfilePath: string;
};

export const generateEntitlementsFile = async ({
  platformName,
  provisioningProfilePath,
}: GenerateEntitlementsFileOptions) => {
  const securityProcess = await spawn('security', [
    'cms',
    '-D',
    '-i',
    provisioningProfilePath,
  ]);

  const profilePlist = plist.parse(securityProcess.stdout);
  const entitlements = getPlistObjectValue(profilePlist, 'Entitlements');

  const entitlementsPath = path.join(
    getSignPath(platformName),
    'entitlements.plist'
  );
  writePlistFile(entitlementsPath, entitlements);

  return entitlementsPath;
};
