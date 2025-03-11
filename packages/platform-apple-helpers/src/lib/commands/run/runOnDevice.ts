import type { SubprocessError } from '@rnef/tools';
import { spawn, spinner } from '@rnef/tools';
import type { Device } from '../../types/index.js';

export async function runOnDevice(
  selectedDevice: Device,
  binaryPath: string,
  sourceDir: string
) {
  const deviceCtlArgs = [
    'devicectl',
    'device',
    'install',
    'app',
    '--device',
    selectedDevice.udid,
    binaryPath,
  ];
  const loader = spinner();
  loader.start(`Installing and launching your app on ${selectedDevice.name}`);

  try {
    await spawn('xcrun', deviceCtlArgs, { cwd: sourceDir });
  } catch (error) {
    loader.stop(
      `Installing and launching your app on ${selectedDevice.name} [stopped]`
    );
    throw new Error(`Failed to install the app on the ${selectedDevice.name}`, {
      cause: (error as SubprocessError).stderr,
    });
  }

  loader.stop(`Installed the app on the ${selectedDevice.name}.`);
  return;
}
