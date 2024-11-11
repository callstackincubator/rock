import { spinner } from '@clack/prompts';
import { execSync, execFileSync } from 'child_process';
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
export function isEmulatorBooted(device: string | undefined): boolean {
  const adbPath = getAdbPath();
  const adbArgs = ['shell', 'getprop', 'sys.boot_completed'];
  try {
    if (device) {
      adbArgs.unshift('-s', device);
    }
    const output = execFileSync(adbPath, adbArgs).toString().trim();
    return output === '1';
  } catch {
    return false;
  }
}

const regex = new RegExp(
  /^\s*UserInfo\{(?<userId>\d+):(?<userName>.*):(?<userFlags>[0-9a-f]*)}/
);

export async function listUsers(device: string) {
  const adbPath = getAdbPath();
  const adbArgs = ['-s', device, 'shell', 'pm', 'list', 'users'];
  const loader = spinner();
  loader.start(`Checking users on "${device}"`);

  try {
    const { stdout, stderr } = await spawn(adbPath, adbArgs);

    if (stderr) {
      loader.stop(`Failed to check users of "${device}". ${stderr}`, 1);
      return [];
    }

    const lines = stdout.split('\n');
    const users = [];

    for (const line of lines) {
      const res = regex.exec(line);
      if (res?.groups) {
        users.push({ id: res.groups['userId'], name: res.groups['userName'] });
      }
    }

    loader.stop(`Found ${users.length} users on "${device}".`);
    return users;
  } catch (error) {
    loader.stop(
      `Unexpected error while checking users of "${device}". Continuing without user selection. Error details: ${
        (error as { message: string }).message
      }.`,
      1
    );
    return [];
  }
}
