import { execSync } from 'child_process';
import { getDevices, getAdbPath } from './adb.js';
import { getEmulators } from './tryLaunchEmulator.js';
import os from 'os';

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
function getEmulatorName(deviceId: string) {
  const adbPath = getAdbPath();
  const buffer = execSync(`${adbPath} -s ${deviceId} emu avd name`);

  // 1st line should get us emu name
  return buffer
    .toString()
    .split(os.EOL)[0]
    .replace(/(\r\n|\n|\r)/gm, '')
    .trim();
}

/**
 *
 * @param deviceId string
 * @returns Android device name in readable format
 */
function getPhoneName(deviceId: string) {
  const adbPath = getAdbPath();
  const buffer = execSync(
    `${adbPath} -s ${deviceId} shell getprop | grep ro.product.model`
  );
  return buffer
    .toString()
    .replace(/\[ro\.product\.model\]:\s*\[(.*)\]/, '$1')
    .trim();
}

export async function listAndroidDevices() {
  const devices = getDevices();

  let allDevices: Array<DeviceData> = [];

  devices.forEach((deviceId) => {
    if (deviceId.includes('emulator')) {
      const emulatorData: DeviceData = {
        deviceId,
        readableName: getEmulatorName(deviceId),
        connected: true,
        type: 'emulator',
      };
      allDevices = [...allDevices, emulatorData];
    } else {
      const phoneData: DeviceData = {
        deviceId,
        readableName: getPhoneName(deviceId),
        type: 'phone',
        connected: true,
      };
      allDevices = [...allDevices, phoneData];
    }
  });

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
