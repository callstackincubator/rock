import { existsSync } from 'node:fs';
import path from 'node:path';
import type { SubprocessError } from '@rock-js/tools';
import { color, logger, RockError, spawn, spinner } from '@rock-js/tools';
import type { Device } from '../../types/index.js';
import { readKeyFromPlist } from '../../utils/plist.js';

export async function launchSimulator(device: Device) {
  if (device.type !== 'simulator') {
    // bail if device is not a simulator
    return undefined;
  }
  /**
   * Booting simulator through `xcrun simctl boot` will boot it in the `headless` mode
   * (running in the background).
   *
   * In order for user to see the app and the simulator itself, we have to make sure
   * that the Simulator.app (or Device Hub on Xcode 27+) is running.
   *
   * For Simulator.app we also pass `-CurrentDeviceUDID` so that when we launch it for
   * the first time, it will not boot the "default" device, but the one we set. We only
   * do this for a device that is not booted yet: for an already booted device Simulator.app
   * re-attempts the boot and shows an "Unable to boot device in current state: Booted" alert.
   */
  const { output } = await spawn('xcode-select', ['-p'], { stdio: 'pipe' });
  const developerDir = output.trim();

  // Xcode 27 replaces Simulator.app with DeviceHub.app and moves it from
  // <Xcode>/Contents/Developer/Applications to <Xcode>/Contents/Applications.
  // Prefer Simulator.app while it exists (Xcode <= 26); fall back to Device Hub.
  // See https://developer.apple.com/documentation/xcode/device-hub
  const simulatorApp = path.join(developerDir, 'Applications', 'Simulator.app');
  const deviceHubApp = path.join(
    developerDir,
    '..',
    'Applications',
    'DeviceHub.app',
  );

  if (existsSync(simulatorApp)) {
    const args =
      device.state === 'Booted'
        ? [simulatorApp]
        : [simulatorApp, '--args', '-CurrentDeviceUDID', device.udid];
    await spawn('open', args);
  } else if (existsSync(deviceHubApp)) {
    try {
      // Device Hub registers the `devices://` URL scheme which focuses a device by UDID.
      await spawn('open', [`devices://device/open?id=${device.udid}`]);
    } catch (error) {
      logger.debug(
        `Failed to open Device Hub via URL scheme, opening the app directly: ${(error as SubprocessError).stderr}`,
      );
      await spawn('open', [deviceHubApp]);
    }
  } else {
    logger.warn(
      `Neither Simulator.app nor DeviceHub.app was found under ${developerDir}. The app will be installed and launched, but the simulator window may not be shown.`,
    );
  }

  if (device.state !== 'Booted') {
    await bootSimulator(device);
  }
}

export async function runOnSimulator(
  device: Device,
  binaryPath: string,
  infoPlistPath: string,
) {
  const loader = spinner();

  loader.start(`Installing the app on ${color.bold(device.name)}`);
  await installAppOnSimulator(device.udid, binaryPath);
  loader.message(`Launching the app on ${color.bold(device.name)}`);
  await launchAppOnSimulator(device.udid, binaryPath, infoPlistPath);
  loader.stop(`Installed and launched the app on ${color.bold(device.name)}.`);
}

async function bootSimulator(selectedSimulator: Device) {
  try {
    await spawn('xcrun', ['simctl', 'boot', selectedSimulator.udid]);
  } catch (error) {
    if (
      // It may happen on GitHub Actions when the simulator is already booted,
      // even though the simctl returns its state as Shutdown
      (error as SubprocessError).stderr.includes(
        'Unable to boot device in current state: Booted',
      )
    ) {
      logger.debug(
        `Simulator ${selectedSimulator.udid} already booted. Skipping.`,
      );
      return;
    }
    throw new RockError('Failed to boot Simulator', {
      cause: (error as SubprocessError).stderr,
    });
  }
}

export default async function installAppOnSimulator(
  udid: string,
  binaryPath: string,
) {
  logger.debug(`Installing "${path.basename(binaryPath)}"`);
  try {
    await spawn('xcrun', ['simctl', 'install', udid, binaryPath]);
  } catch (error) {
    throw new RockError('Failed to install the app on Simulator', {
      cause: (error as SubprocessError).stderr,
    });
  }
}

export async function launchAppOnSimulator(
  udid: string,
  binaryPath: string,
  infoPlistPath: string,
) {
  const infoPlist = binaryPath
    ? // @todo Info.plist is hardcoded when reading from binaryPath
      path.join(binaryPath, 'Info.plist')
    : infoPlistPath;
  const bundleID = await readKeyFromPlist(infoPlist, 'CFBundleIdentifier');
  logger.debug(`Launching "${bundleID}"`);
  try {
    await spawn('xcrun', ['simctl', 'launch', udid, bundleID]);
  } catch (error) {
    throw new RockError(`Failed to launch the app on Simulator`, {
      cause: (error as SubprocessError).stderr,
    });
  }
}
