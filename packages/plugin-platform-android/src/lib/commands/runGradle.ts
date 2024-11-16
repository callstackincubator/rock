import { logger } from '@callstack/rnef-tools';
import { getTaskNames } from './buildAndroid/getTaskNames.js';
import { AndroidProject, Flags } from './runAndroid/runAndroid.js';
import { getCPU, getDevices } from './runAndroid/adb.js';
import spawn from 'nano-spawn';
import type { BuildFlags } from './buildAndroid/buildAndroid.js';

export async function runGradle({
  taskType,
  androidProject,
  selectedTask,
  args,
}: {
  taskType: 'install' | 'bundle' | 'assemble';
  androidProject: AndroidProject;
  selectedTask?: string;
  args: BuildFlags | Flags;
}) {
  if ('binaryPath' in args) {
    return;
  }
  const gradleArgs = getTaskNames(
    androidProject.appName,
    args.mode,
    selectedTask ? [selectedTask] : args.tasks,
    taskType
  );

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
