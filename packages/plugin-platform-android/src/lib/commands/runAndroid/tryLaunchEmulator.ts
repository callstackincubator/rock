import os from 'os';
import spawn from 'nano-spawn';
import { getDevices } from '../buildAndroid/adb.js';
import { spinner } from '@clack/prompts';

const emulatorCommand = process.env['ANDROID_HOME']
  ? `${process.env['ANDROID_HOME']}/emulator/emulator`
  : 'emulator';

export const getEmulators = async () => {
  try {
    const { stdout } = await spawn(emulatorCommand, ['-list-avds']);
    return stdout
      .split(os.EOL)
      .filter((name) => name !== '' && !name.includes(' '));
    // The `name` is AVD ID which is expected to not contain whitespace.
    // The `emulator` command, however, can occasionally return verbose
    // information about crashes or similar. Hence filtering out anything
    // that has basic whitespace.
  } catch {
    return [];
  }
};

const launchEmulator = async (
  emulatorName: string,
  port?: number
): Promise<boolean> => {
  const manualCommand = `${emulatorCommand} @${emulatorName}`;

  const cp = spawn(
    emulatorCommand,
    port ? [`@${emulatorName}`, '-port', `${port}`] : [`@${emulatorName}`],
    {
      detached: true,
      stdio: 'ignore',
    }
  );
  (await cp.nodeChildProcess).unref();
  const timeout = 30;

  return new Promise<boolean>((resolve, reject) => {
    const bootCheckInterval = setInterval(async () => {
      const devices = getDevices();
      const connected = port
        ? devices.find((d) => d.includes(`${port}`))
        : devices.length > 0;
      if (connected) {
        cleanup();
        resolve(true);
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

export default async function tryLaunchEmulator(name?: string, port?: number) {
  const loader = spinner();
  loader.start(`Looking for available emulators"`);
  const emulators = await getEmulators();
  const emulatorName = name ?? emulators[0];
  if (emulators.length > 0) {
    try {
      loader.message(`Launching emulator "${emulatorName}"`);
      await launchEmulator(emulatorName, port);
      loader.stop(`Launched emulator "${emulatorName}".`);
    } catch (error) {
      loader.stop(
        `Failed to launch emulator "${emulatorName}". ${
          (error as { message: string }).message
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
}
