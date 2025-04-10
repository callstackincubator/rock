import os from 'node:os';
import { spawn } from '@rnef/tools';
import { getAdbPath, getDevices } from './adb.js';
import { getEmulators } from './tryLaunchEmulator.js';

export type DeviceData = {
  deviceId: string | undefined;
  readableName: string;
  connected: boolean;
  type: 'emulator' | 'phone';
};

/**
 *
 * @param deviceId string
 * @returns name of Android emulator
 */
async function getEmulatorName(deviceId: string) {
  const adbPath = getAdbPath();
  const { output } = await spawn(
    adbPath,
    ['-s', deviceId, 'emu', 'avd', 'name'],
    { stdio: 'pipe' }
  );

  // 1st line should get us emu name
  return output
    .split(os.EOL)[0]
    .replace(/(\r\n|\n|\r)/gm, '')
    .trim();
}

/**
 *
 * @param deviceId string
 * @returns Android device name in readable format
 */
async function getPhoneName(deviceId: string) {
  const adbPath = getAdbPath();
  const { output } = await spawn(
    adbPath,
    ['-s', deviceId, 'shell', 'getprop', 'ro.product.model'],
    { stdio: 'pipe' }
  );
  return output.replace(/\[ro\.product\.model\]:\s*\[(.*)\]/, '$1').trim();
}

export async function listAndroidDevices() {
  const devices = await getDevices();

  let allDevices: Array<DeviceData> = [];

  for (const deviceId of devices) {
    if (deviceId.includes('emulator')) {
      const emulatorData: DeviceData = {
        deviceId,
        readableName: await getEmulatorName(deviceId),
        connected: true,
        type: 'emulator',
      };
      allDevices = [...allDevices, emulatorData];
    } else {
      const phoneData: DeviceData = {
        deviceId,
        readableName: await getPhoneName(deviceId),
        type: 'phone',
        connected: true,
      };
      allDevices = [...allDevices, phoneData];
    }
  }

  const emulators = await getEmulators();

  // Find not booted ones:
  emulators.forEach((emulatorName) => {
    // skip those already booted
    if (allDevices.some((device) => device.readableName === emulatorName)) {
      return;
    }
    const emulatorData: DeviceData = {
      deviceId: undefined,
      readableName: emulatorName,
      type: 'emulator',
      connected: false,
    };
    allDevices = [...allDevices, emulatorData];
  });

  return allDevices;
}
