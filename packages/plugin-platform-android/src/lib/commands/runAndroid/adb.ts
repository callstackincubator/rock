import spawn from 'nano-spawn';
import path from 'node:path';

export function getAdbPath() {
  return process.env['ANDROID_HOME']
    ? path.join(process.env['ANDROID_HOME'], 'platform-tools', 'adb')
    : 'adb';
}

/**
 * Parses the output of the 'adb devices' command
 */
function parseDevicesResult(result: string): Array<string> {
  if (!result) {
    return [];
  }

  const devices = [];
  const lines = result.trim().split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const words = lines[i].split(/[ ,\t]+/).filter((w) => w !== '');

    if (words[1] === 'device') {
      devices.push(words[0]);
    }
  }
  return devices;
}

/**
 * Executes the commands needed to get a list of devices from ADB
 */
export async function getDevices() {
  const adbPath = getAdbPath();
  try {
    const { output } = await spawn(adbPath, ['devices']);
    return parseDevicesResult(output);
  } catch {
    return [];
  }
}

/**
 * Gets available CPUs of devices from ADB
 */
export async function getAvailableCPUs(device: string) {
  const adbPath = getAdbPath();
  try {
    const adbArgs = [
      '-s',
      device,
      'shell',
      'getprop',
      'ro.product.cpu.abilist',
    ];

    const { output } = await spawn(adbPath, adbArgs);

    return output.trim().split(',');
  } catch {
    return [];
  }
}

/**
 * Gets the CPU architecture of a device from ADB
 */
export async function getCPU(device: string) {
  const adbPath = getAdbPath();
  try {
    const { output } = await spawn(adbPath, [
      '-s',
      device,
      'shell',
      'getprop',
      'ro.product.cpu.abi',
    ]);
    const cpus = output.trim();
    return cpus.length > 0 ? cpus : null;
  } catch {
    return null;
  }
}

/**
 * Check if emulator is booted
 */
export async function isEmulatorBooted(device: string) {
  const adbPath = getAdbPath();
  const adbArgs = ['-s', device, 'shell', 'getprop', 'sys.boot_completed'];
  try {
    const { output } = await spawn(adbPath, adbArgs);
    return output.trim() === '1';
  } catch {
    return false;
  }
}
