import path from 'node:path';
import { spawn } from '@rock-js/tools';

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
    const { output } = await spawn(adbPath, ['devices'], { stdio: 'pipe' });
    return parseDevicesResult(output);
  } catch {
    return [];
  }
}
