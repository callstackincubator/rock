import child_process from 'child_process';
import { logger } from '@callstack/rnef-tools';
import { ApplePlatform, Device, XcodeProjectInfo } from '../../types/index.js';
import { buildProject } from '../build/buildProject.js';
import { formattedDeviceName } from './matchingDevice.js';
import installApp from './installApp.js';
import { RunFlags } from './runOptions.js';
import spawn from 'nano-spawn';
import { spinner } from '@clack/prompts';

export async function runOnSimulator(
  xcodeProject: XcodeProjectInfo,
  platform: ApplePlatform,
  mode: string,
  scheme: string,
  args: RunFlags,
  simulator: Device
) {
  const { binaryPath, target } = args;

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
  const activeDeveloperDir = child_process
    .execFileSync('xcode-select', ['-p'], { encoding: 'utf8' })
    .trim();

  const loader = spinner();
  loader.start(`Launching Simulator "${simulator.name}"`);
  await spawn('open', [
    `${activeDeveloperDir}/Applications/Simulator.app`,
    '--args',
    '-CurrentDeviceUDID',
    simulator.udid,
  ]);
  loader.stop(`Launched Simulator "${simulator.name}"`);

  if (simulator.state !== 'Booted') {
    await bootSimulator(simulator);
  }

  let buildOutput;
  if (!binaryPath) {
    buildOutput = await buildProject(
      xcodeProject,
      platform,
      simulator.udid,
      scheme,
      mode,
      args
    );
  }

  loader.start(`Installing the app on "${simulator.name}"`);
  await installApp({
    buildOutput: buildOutput ?? '',
    xcodeProject,
    mode,
    scheme,
    target,
    udid: simulator.udid,
    binaryPath,
  });
  loader.stop(`Installed the app on "${simulator.name}".`);
}

async function bootSimulator(selectedSimulator: Device) {
  const simulatorFullName = formattedDeviceName(selectedSimulator);
  logger.info(`Launching ${simulatorFullName}`);

  await spawn('xcrun', ['simctl', 'boot', selectedSimulator.udid]);
}
