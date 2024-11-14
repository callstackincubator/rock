import { spinner } from '@clack/prompts';
import { logger, spinnerMock } from '@callstack/rnef-tools';
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
  if (args.tasks && args.mode) {
    logger.warn(
      'Both "tasks" and "mode" parameters were passed to "build" command. Using "tasks" for building the app.'
    );
  }

  const gradleArgs = getTaskNames(
    androidProject.appName,
    args.mode,
    selectedTask ? [selectedTask] : args.tasks,
    taskType === 'install' ? 'install' : 'bundle'
  );

  gradleArgs.push('-x', 'lint');

  if (args.extraParams) {
    gradleArgs.push(...args.extraParams);
  }

  if ('port' in args && args.port != null) {
    gradleArgs.push('-PreactNativeDevServerPort=' + args.port);
  }

  if (args.activeArchOnly) {
    const devices = getDevices();
    const architectures = devices
      .map(getCPU)
      .filter(
        (arch, index, array) => arch != null && array.indexOf(arch) === index
      );

    if (architectures.length > 0) {
      gradleArgs.push('-PreactNativeArchitectures=' + architectures.join(','));
    }
  }

  const gradleWrapper = getGradleWrapper();
  const loader = logger.isVerbose() ? spinnerMock() : spinner();

  try {
    loader.start('Building the app with Gradle');
    await spawn(gradleWrapper, gradleArgs, {
      stdio: logger.isVerbose() ? 'inherit' : ['ignore', 'ignore', 'inherit'],
      cwd: androidProject.sourceDir,
    });
    loader.stop('Build successful.');
  } catch {
    loader.stop(
      `Failed to build the app. See the error above for details from Gradle.`,
      1
    );
    process.exit(1);
  }
}

export function getGradleWrapper() {
  return process.platform.startsWith('win') ? 'gradlew.bat' : './gradlew';
}
