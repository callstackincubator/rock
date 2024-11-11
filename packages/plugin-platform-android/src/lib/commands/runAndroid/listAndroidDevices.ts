import { execSync } from 'child_process';
import { getDevices, getAdbPath } from '../buildAndroid/adb.js';
import { getEmulators } from './tryLaunchEmulator.js';
import { toPascalCase } from '../buildAndroid/toPascalCase.js';
import os from 'os';
import chalk from 'chalk';
import { select } from '@clack/prompts';

type DeviceData = {
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

async function promptForDeviceSelection(
  allDevices: Array<DeviceData>
): Promise<DeviceData> {
  if (!allDevices.length) {
    throw new Error(
      'No devices and/or emulators connected. Please create emulator with Android Studio or connect Android device.'
    );
  }
  const selected = (await select({
    message: 'Select the device / emulator you want to use',
    options: allDevices.map((d) => ({
      label: `${chalk.bold(`${toPascalCase(d.type)}`)} ${chalk.green(
        `${d.readableName}`
      )} (${d.connected ? 'connected' : 'disconnected'})`,
      value: d,
    })),
  })) as DeviceData;

  return selected;
}

async function listAndroidDevices() {
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

  const selectedDevice = await promptForDeviceSelection(allDevices);
  return selectedDevice;
}

export default listAndroidDevices;
