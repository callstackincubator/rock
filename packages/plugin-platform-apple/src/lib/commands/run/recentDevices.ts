import path from 'node:path';
import fs from 'node:fs';
import { ApplePlatform, Device } from '../../types/index.js';
import { cacheManager, logger } from '@callstack/rnef-tools';

function getProjectNameFromPackageJson(projectRoot: string) {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  return JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')).name;
}

export function cacheRecentDevice(
  device: Device,
  projectRoot: string,
  platform: ApplePlatform
) {
  const cacheKey = 'recentDevicesUDID-' + platform;
  const name = getProjectNameFromPackageJson(projectRoot);
  try {
    const recentDevices = getRecentDevices(projectRoot, platform);
    const newRecentDevices = [device.udid, ...recentDevices];
    const uniqueDevices = Array.from(new Set(newRecentDevices)).slice(0, 5);
    cacheManager.set(name, cacheKey, JSON.stringify(uniqueDevices));
  } catch (error) {
    logger.debug(
      `Failed to cache recent device ${device.name} with UDID ${device.udid}. ${error}`
    );
  }
}

function getRecentDevices(
  projectRoot: string,
  platform: ApplePlatform
): string[] {
  const cacheKey = 'recentDevicesUDID-' + platform;
  const name = getProjectNameFromPackageJson(projectRoot);
  const recentDevicesString = cacheManager.get(name, cacheKey);
  try {
    return recentDevicesString ? JSON.parse(recentDevicesString) : [];
  } catch (error) {
    logger.debug(`Failed to read recent devices from cache. ${error}`);
    return [];
  }
}

export function sortByRecentDevices(
  devices: Device[],
  projectRoot: string,
  platform: ApplePlatform
) {
  const recentDevices = getRecentDevices(projectRoot, platform);
  const udids = Array.from(
    new Set([...recentDevices, ...devices.map(({ udid }) => udid)])
  );
  return udids
    .map((udid) => devices.find((device) => device.udid === udid))
    .filter(Boolean) as Device[];
}
