import path from 'node:path';
import type { SubprocessError } from '@rnef/tools';
import { logger, RnefError, spawn, spinner } from '@rnef/tools';
import type { Device } from '../../types/index.js';
import { readKeyFromPlist } from '../../utils/plist.js';

export async function runOnSimulator(
  device: Device,
  binaryPath: string,
  infoPlistPath: string
) {
  /**
   * Booting simulator through `xcrun simctl boot` will boot it in the `headless` mode
   * (running in the background).
   *
   * In order for user to see the app and the simulator itself, we have to make sure
   * that the Simulator.app is running.
   *
   * We also pass it `-CurrentDeviceUDID` so that when we launch it for the first time,
   * it will not boot the "default" device, but the one we set. If the app is already running,
   * this flag has no effect.
   */
  const { output: activeDeveloperDir } = await spawn('xcode-select', ['-p']);

  const loader = spinner();
  loader.start(`Launching Simulator "${device.name}"`);
  await spawn('open', [
    `${activeDeveloperDir}/Applications/Simulator.app`,
    '--args',
    '-CurrentDeviceUDID',
    device.udid,
  ]);

  if (device.state !== 'Booted') {
    await bootSimulator(device);
  }
  loader.stop(`Launched Simulator "${device.name}".`);

  loader.start(`Installing the app on "${device.name}"`);
  await installAppOnSimulator(device.udid, binaryPath);
  loader.stop(`Installed the app on "${device.name}".`);

  loader.start(`Launching the app on "${device.name}"`);
  await launchAppOnSimulator(device.udid, infoPlistPath);
  loader.stop(`Launched the app on "${device.name}".`);
}

async function bootSimulator(selectedSimulator: Device) {
  await spawn('xcrun', ['simctl', 'boot', selectedSimulator.udid]);
}

export default async function installAppOnSimulator(
  udid: string,
  binaryPath: string
) {
  logger.debug(`Installing "${path.basename(binaryPath)}"`);
  try {
    await spawn('xcrun', ['simctl', 'install', udid, binaryPath]);
  } catch (error) {
    throw new RnefError('Failed to install the app on Simulator', {
      cause: (error as SubprocessError).stderr,
    });
  }
}

export async function launchAppOnSimulator(
  udid: string,
  infoPlistPath: string
) {
  const bundleID = await readKeyFromPlist(infoPlistPath, 'CFBundleIdentifier');
  logger.debug(`Launching "${bundleID}"`);
  try {
    await spawn('xcrun', ['simctl', 'launch', udid, bundleID]);
  } catch (error) {
    throw new RnefError(`Failed to launch the app on Simulator`, {
      cause: (error as SubprocessError).stderr,
    });
  }
}
