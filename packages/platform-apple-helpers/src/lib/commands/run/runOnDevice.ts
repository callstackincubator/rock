import type { SubprocessError } from '@rock-js/tools';
import { color, RockError, spawn, spinner } from '@rock-js/tools';
import type { Device } from '../../types/index.js';

export async function runOnDevice(
  selectedDevice: Device,
  binaryPath: string,
  sourceDir: string,
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
  loader.start(
    `Installing and launching your app on ${color.bold(selectedDevice.name)}`,
  );
  try {
    await spawn('xcrun', deviceCtlArgs, { cwd: sourceDir });
  } catch (error) {
    loader.stop(
      `Failed: Installing and launching your app on ${color.bold(
        selectedDevice.name,
      )}`,
    );
    throw new RockError((error as SubprocessError).stderr);
  }

  loader.stop(`Installed the app on ${color.bold(selectedDevice.name)}.`);
  return;
}
