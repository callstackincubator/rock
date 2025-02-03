import * as fs from 'node:fs';
import * as path from 'node:path';
import { getDotRnefPath, logger, spawn } from '@rnef/tools';

export type GenerateEntitlementsFileOptions = {
  platformName: string;
  provisioningProfilePath: string;
};

export const generateEntitlementsFile = async ({
  platformName,
  provisioningProfilePath,
}: GenerateEntitlementsFileOptions) => {
  const rnefPath = path.join(getDotRnefPath(), platformName, 'sign');

  const tempProfilePath = path.join(rnefPath, 'provisioning.mobileprovision');
  const securityProcess = await spawn('security', [
    'cms',
    '-D',
    '-i',
    provisioningProfilePath,
  ]);
  logger.debug('Running security command: ', securityProcess.command);
  logger.debug('Security stdout: ', securityProcess.stdout);
  logger.debug('Security stderr: ', securityProcess.stderr);
  fs.writeFileSync(tempProfilePath, securityProcess.stdout);

  const plistBuddyProcess = await spawn('/usr/libexec/PlistBuddy', [
    '-x',
    '-c',
    'Print :Entitlements',
    tempProfilePath,
  ]);

  const entitlementsPath = path.join(rnefPath, 'entitlements.plist');
  logger.debug('Running PListBuddy command: ', plistBuddyProcess.command);
  logger.debug('PListBuddy stdout: ', plistBuddyProcess.stdout);
  logger.debug('PListBuddy stderr: ', plistBuddyProcess.stderr);
  fs.writeFileSync(entitlementsPath, plistBuddyProcess.stdout);

  return entitlementsPath;
};
