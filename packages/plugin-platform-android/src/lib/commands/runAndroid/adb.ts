import { execSync, execFileSync } from 'child_process';
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
export function getDevices(): Array<string> {
  const adbPath = getAdbPath();
  try {
    const devicesResult = execSync(`"${adbPath}" devices`);
    return parseDevicesResult(devicesResult.toString());
  } catch {
    return [];
  }
}

/**
 * Gets available CPUs of devices from ADB
 */
export function getAvailableCPUs(device: string): Array<string> {
  const adbPath = getAdbPath();
  try {
    const baseArgs = ['-s', device, 'shell', 'getprop'];

    let cpus = execFileSync(
      adbPath,
      baseArgs.concat(['ro.product.cpu.abilist'])
    ).toString();

    // pre-Lollipop
    if (!cpus || cpus.trim().length === 0) {
      cpus = execFileSync(
        adbPath,
        baseArgs.concat(['ro.product.cpu.abi'])
      ).toString();
    }

    return (cpus || '').trim().split(',');
  } catch {
    return [];
  }
}

/**
 * Gets the CPU architecture of a device from ADB
 */
export function getCPU(device: string): string | null {
  const adbPath = getAdbPath();
  try {
    const cpus = execFileSync(adbPath, [
      '-s',
      device,
      'shell',
      'getprop',
      'ro.product.cpu.abi',
    ])
      .toString()
      .trim();

    return cpus.length > 0 ? cpus : null;
  } catch {
    return null;
  }
}

/**
 * Check if emulator is booted
 */
export function isEmulatorBooted(device: string): boolean {
  const adbPath = getAdbPath();
  const adbArgs = ['-s', device, 'shell', 'getprop', 'sys.boot_completed'];
  try {
    const output = execFileSync(adbPath, adbArgs).toString().trim();
    return output === '1';
  } catch {
    return false;
  }
}
