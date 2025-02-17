import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from '@rnef/tools';
import type { ApplePlatform, Device } from '../types/index.js';

type DevicectlOutput = {
  capabilities: object[];
  connectionProperties: object;
  deviceProperties: {
    bootedFromSnapshot: boolean;
    bootedSnapshotName: string;
    ddiServicesAvailable: boolean;
    developerModeStatus: string;
    hasInternalOSBuild: boolean;
    name: string;
    osBuildUpdate: string;
    osVersionNumber: string;
    rootFileSystemIsWritable: boolean;
    bootState?: string;
    screenViewingURL?: string;
  };
  hardwareProperties: {
    cpuType: object;
    deviceType: string;
    ecid: number;
    hardwareModel: string;
    internalStorageCapacity: number;
    isProductionFused: boolean;
    marketingName: string;
    platform: string;
    productType: string;
    reality: string;
    serialNumber: string;
    supportedCPUTypes: object[];
    supportedDeviceFamilies: number[];
    thinningProductType: string;
    udid: string;
  };
  identifier: string;
  tags: unknown[];
  visibilityClass: string;
};

function parseDevicectlList(devicectlOutput: DevicectlOutput[]): Device[] {
  const devices: Device[] = devicectlOutput.map((device) => ({
    name: device.deviceProperties.name,
    udid: device.hardwareProperties.udid,
    version: `${device.hardwareProperties.platform} ${device.deviceProperties.osVersionNumber}`,
    platform: getPlatformFromOsVersion(device.hardwareProperties.platform),
    state:
      device.deviceProperties.bootState === 'booted' ? 'Booted' : 'Shutdown',
    type: 'device',
  }));
  return devices;
}

async function getDevices() {
  const tmpPath = path.resolve(os.tmpdir(), 'iosPhysicalDevices.json'); // same as Minisim.app
  await spawn('xcrun', ['devicectl', 'list', 'devices', '-j', tmpPath]);
  const output = JSON.parse(fs.readFileSync(tmpPath, 'utf8'));

  return parseDevicectlList(output.result.devices);
}

async function getSimulators() {
  const { output } = await spawn('xcrun', [
    'simctl',
    'list',
    'devices',
    'available',
  ]);
  return parseSimctlOutput(output);
}

export async function listDevicesAndSimulators(platform: ApplePlatform) {
  const simulators = await getSimulators();
  const devices = await getDevices();
  return [...simulators, ...devices].filter(
    (device) => device.platform === platform
  );
}

function parseSimctlOutput(input: string): Device[] {
  const lines = input.split('\n');
  const devices: Device[] = [];
  const currentOSIdx = 1;
  const deviceNameIdx = 1;
  const identifierIdx = 4;
  const deviceStateIdx = 5;
  let osVersion = '';

  lines.forEach((line) => {
    const currentOsMatch = line.match(/-- (.*?) --/);
    if (currentOsMatch && currentOsMatch.length > 0) {
      osVersion = currentOsMatch[currentOSIdx];
    }
    const deviceMatch = line.match(
      /(.*?) (\(([0-9.]+)\) )?\(([0-9A-F-]+)\) \((.*?)\)/
    );
    if (deviceMatch && deviceMatch.length > 0) {
      devices.push({
        name: deviceMatch[deviceNameIdx].trim(),
        udid: deviceMatch[identifierIdx],
        version: osVersion,
        platform: getPlatformFromOsVersion(osVersion.split(' ')[0]),
        state: deviceMatch[deviceStateIdx] as 'Booted' | 'Shutdown',
        type: 'simulator',
      });
    }
  });

  return devices;
}

function getPlatformFromOsVersion(
  osVersion: string
): ApplePlatform | undefined {
  switch (osVersion) {
    case 'iOS':
      return 'ios';
    case 'tvOS':
      return 'tvos';
    case 'macOS':
      return 'macos';
    case 'xrOS':
    case 'visionOS':
      return 'visionos';
    default:
      return undefined;
  }
}
