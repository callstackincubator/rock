import { logger } from '@callstack/rnef-tools';
import type { AndroidProject, Flags } from './runAndroid/runAndroid.js';
import { getAdbPath, getDevices } from './runAndroid/adb.js';
import spawn from 'nano-spawn';
import type { BuildFlags } from './buildAndroid/buildAndroid.js';

export async function runGradle({
  tasks,
  androidProject,
  args,
}: {
  tasks: string[];
  androidProject: AndroidProject;
  args: BuildFlags | Flags;
}) {
  if ('binaryPath' in args) {
    return;
  }
  const gradleArgs = getTaskNames(androidProject.appName, tasks);

  gradleArgs.push('-x', 'lint');

  if (args.extraParams) {
    gradleArgs.push(...args.extraParams);
  }

  if ('port' in args && args.port != null) {
    gradleArgs.push('-PreactNativeDevServerPort=' + args.port);
  }

  if (args.activeArchOnly) {
    const devices = await getDevices();
    const cpus = await Promise.all(devices.map(getCPU));
    const architectures = cpus.filter(
      (arch, index, array) => arch != null && array.indexOf(arch) === index
    );

    if (architectures.length > 0) {
      gradleArgs.push('-PreactNativeArchitectures=' + architectures.join(','));
    }
  }

  const gradleWrapper = getGradleWrapper();

  try {
    logger.debug(`Running ${gradleWrapper} ${gradleArgs.join(' ')}.`);
    await spawn(gradleWrapper, gradleArgs, {
      stdio: 'inherit',
      cwd: androidProject.sourceDir,
    });
  } catch {
    logger.error(
      `Failed to build the app. See the error above for details from Gradle.`
    );
    process.exit(1);
  }
}

export function getGradleWrapper() {
  return process.platform.startsWith('win') ? 'gradlew.bat' : './gradlew';
}

function getTaskNames(appName: string, tasks: string[]): Array<string> {
  return tasks.map((task) => `${appName}:${task}`);
}

/**
 * Gets the CPU architecture of a device from ADB
 */
async function getCPU(device: string) {
  const adbPath = getAdbPath();
  try {
    const { output } = await spawn(adbPath, [
      '-s',
      device,
      'shell',
      'getprop',
      'ro.product.cpu.abi',
    ]);
    const cpus = output.trim();
    return cpus.length > 0 ? cpus : null;
  } catch {
    return null;
  }
}
