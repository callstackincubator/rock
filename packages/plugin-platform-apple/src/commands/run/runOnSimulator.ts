import child_process from 'child_process';
import { logger } from '@callstack/rnef-tools';
import { ApplePlatform, Device, XcodeProjectInfo } from '../../types/index.js';
import { buildProject } from '../build/buildProject.js';
import { formattedDeviceName } from './matchingDevice.js';
import installApp from './installApp.js';
import { RunFlags } from './runOptions.js';

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

  child_process.execFileSync('open', [
    `${activeDeveloperDir}/Applications/Simulator.app`,
    '--args',
    '-CurrentDeviceUDID',
    simulator.udid,
  ]);

  if (simulator.state !== 'Booted') {
    bootSimulator(simulator);
  }

  let buildOutput;
  if (!binaryPath) {
    buildOutput = await buildProject(
      xcodeProject,
      platform,
      simulator.udid,
      args
    );
  }

  installApp({
    buildOutput: buildOutput ?? '',
    xcodeProject,
    mode,
    scheme,
    target,
    udid: simulator.udid,
    binaryPath,
  });
}

function bootSimulator(selectedSimulator: Device) {
  const simulatorFullName = formattedDeviceName(selectedSimulator);
  logger.info(`Launching ${simulatorFullName}`);

  child_process.spawnSync('xcrun', ['simctl', 'boot', selectedSimulator.udid]);
}
