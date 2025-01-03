import { spinner } from '@clack/prompts';
import spawn from 'nano-spawn';
import { ApplePlatform, Device, XcodeProjectInfo } from '../../types/index.js';
import { buildProject } from '../build/buildProject.js';
import { fetchCachedBuild } from './fetchCachedBuild.js';
import installApp from './installApp.js';
import { RunFlags } from './runOptions.js';

export async function runOnSimulator(
  simulator: Device,
  xcodeProject: XcodeProjectInfo,
  sourceDir: string,
  platform: ApplePlatform,
  mode: string,
  scheme: string,
  args: RunFlags
) {
  if (!args.binaryPath && args.remoteCache) {
    const cachedBuild = await fetchCachedBuild({ mode: args.mode });
    if (cachedBuild) {
      // @todo replace with a more generic way to pass binary path
      args.binaryPath = cachedBuild.binaryPath;
    }
  }

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
  loader.start(`Launching Simulator "${simulator.name}"`);
  await spawn('open', [
    `${activeDeveloperDir}/Applications/Simulator.app`,
    '--args',
    '-CurrentDeviceUDID',
    simulator.udid,
  ]);

  if (simulator.state !== 'Booted') {
    await bootSimulator(simulator);
  }
  loader.stop(`Launched Simulator "${simulator.name}".`);

  if (!args.binaryPath) {
    await buildProject(
      xcodeProject,
      sourceDir,
      platform,
      simulator.udid,
      scheme,
      mode,
      args
    );
  }

  loader.start(`Installing the app on "${simulator.name}"`);
  await installApp({
    xcodeProject,
    sourceDir,
    mode,
    scheme,
    target: args.target,
    udid: simulator.udid,
    binaryPath: args.binaryPath,
    platform,
  });
  loader.stop(`Installed the app on "${simulator.name}".`);
}

async function bootSimulator(selectedSimulator: Device) {
  await spawn('xcrun', ['simctl', 'boot', selectedSimulator.udid]);
}
