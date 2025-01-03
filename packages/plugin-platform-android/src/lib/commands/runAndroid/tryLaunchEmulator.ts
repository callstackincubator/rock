import os from 'node:os';
import { spinner } from '@clack/prompts';
import type { SubprocessError } from 'nano-spawn';
import spawn from 'nano-spawn';
import { getAdbPath, getDevices } from './adb.js';

const emulatorCommand = process.env['ANDROID_HOME']
  ? `${process.env['ANDROID_HOME']}/emulator/emulator`
  : 'emulator';

export const getEmulators = async () => {
  try {
    const { output } = await spawn(emulatorCommand, ['-list-avds']);
    // The `name` is AVD ID which is expected to not contain whitespace.
    // The `emulator` command, however, can occasionally return verbose
    // information about crashes or similar. Hence filtering out anything
    // that has basic whitespace.
    return output
      .split(os.EOL)
      .filter((name) => name !== '' && !name.includes(' '));
  } catch {
    return [];
  }
};

const launchEmulator = async (
  emulatorName: string,
  port: number,
  loader: ReturnType<typeof spinner>
): Promise<string> => {
  const manualCommand = `${emulatorCommand} @${emulatorName}`;

  const cp = spawn(emulatorCommand, [`@${emulatorName}`, '-port', `${port}`], {
    detached: true,
    stdio: 'ignore',
  });
  (await cp.nodeChildProcess).unref();
  const timeout = 120;

  return new Promise<string>((resolve, reject) => {
    const bootCheckInterval = setInterval(async () => {
      const devices = await getDevices();
      const connected = port
        ? devices.find((d) => d.includes(`${port}`))
        : false;

      if (connected) {
        loader.message(
          `Emulator "${emulatorName}" is connected. Waiting for boot`
        );
        if (await isEmulatorBooted(connected)) {
          cleanup();
          resolve(connected);
        }
      }
    }, 1000);
    // Reject command after timeout
    const rejectTimeout = setTimeout(() => {
      stopWaitingAndReject(
        `It took too long to start and connect with Android emulator: ${emulatorName}. You can try starting the emulator manually from the terminal with: ${manualCommand}`
      );
    }, timeout * 1000);

    const cleanup = () => {
      clearTimeout(rejectTimeout);
      clearInterval(bootCheckInterval);
    };

    const stopWaitingAndReject = (message: string) => {
      cleanup();
      reject(new Error(message));
    };

    cp.nodeChildProcess.catch((error) => {
      stopWaitingAndReject(error);
    });
  });
};

const defaultPort = 5552;
async function getAvailableDevicePort(
  port: number = defaultPort
): Promise<number> {
  /**
   * The default value is 5554 for the first virtual device instance running on your machine. A virtual device normally occupies a pair of adjacent ports: a console port and an adb port. The console of the first virtual device running on a particular machine uses console port 5554 and adb port 5555. Subsequent instances use port numbers increasing by two. For example, 5556/5557, 5558/5559, and so on. The range is 5554 to 5682, allowing for 64 concurrent virtual devices.
   */
  const devices = await getDevices();
  if (port > 5682) {
    throw new Error('Failed to launch emulator');
  }
  if (devices.some((d) => d.includes(port.toString()))) {
    return await getAvailableDevicePort(port + 2);
  }
  return port;
}

export async function tryLaunchEmulator(name?: string) {
  const port = await getAvailableDevicePort();
  const loader = spinner();
  loader.start(`Looking for available emulators"`);
  const emulators = await getEmulators();
  const emulatorName = name ?? emulators[0];
  let deviceId;
  if (emulators.length > 0) {
    try {
      loader.message(`Launching emulator "${emulatorName}"`);
      deviceId = await launchEmulator(emulatorName, port, loader);
      loader.stop(`Launched ${emulatorName} emulator.`);
    } catch (error) {
      loader.stop(
        `Failed to launch ${emulatorName} emulator. ${
          (error as SubprocessError).message
        }`,
        1
      );
    }
  } else {
    loader.stop(
      'No emulators found as an output of `emulator -list-avds`. Please launch an emulator manually or connect a device',
      1
    );
  }
  return deviceId;
}

/**
 * Check if emulator is booted
 */
async function isEmulatorBooted(device: string) {
  const adbPath = getAdbPath();
  const adbArgs = ['-s', device, 'shell', 'getprop', 'sys.boot_completed'];
  try {
    const { output } = await spawn(adbPath, adbArgs);
    return output.trim() === '1';
  } catch {
    return false;
  }
}
